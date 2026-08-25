import { describe, expect, it, afterAll } from "vitest";
import {
  TEST_DATABASE_URL,
  getTestDb,
} from "@/test-support/test-db";
import { memoryStorage } from "@/test-support/memory-storage";
import { buildTextPdf } from "@/test-support/pdf-writer";
import {
  createQueuedDocument,
  getDocumentForUser,
  listDocumentsForUser,
  softDeleteDocument,
} from "@/lib/documents/repository";
import {
  runDocumentPipeline,
  mapPipelineFailure,
} from "@/lib/pipeline/service";
import type { GeminiTransport } from "@/lib/gemini/gateway";

const d = TEST_DATABASE_URL ? describe : describe.skip;

function okTransport(): GeminiTransport {
  return {
    async generate() {
      return {
        text: JSON.stringify({
          overview: { document_type: "nda" },
          highlights: [
            {
              title: "Care standard",
              explanation: "Reasonable care is the protection standard.",
              source: { page: 1, quote: "reasonable care" },
            },
          ],
          positive_points: [],
          concerns: [
            {
              title: "Duration",
              priority: "low",
              document_fact: "Obligations last three years.",
              interpretation: "Sharing later may still be restricted.",
              uncertainty: "Treatment depends on applicable law.",
              plain_english: "This lasts three years.",
              source: { page: 1, quote: "three years" },
            },
          ],
          questions_to_ask: [],
        }),
        inputTokens: 42,
        outputTokens: 17,
      };
    },
  };
}

const fixturePdf = buildTextPdf([
  [
    "MUTUAL NON-DISCLOSURE AGREEMENT between TestCo and the Receiving Party.",
    "The Receiving Party shall protect Confidential Information with",
    "reasonable care. Obligations survive for three years from disclosure.",
    "Additional padding text to push the character count beyond the",
    "scanned-document threshold of two hundred characters for this test.",
  ],
]);

async function seedQueuedDoc(userId: string) {
  await getTestDb();
  const storage = memoryStorage();
  const objectPath = `${userId}/${crypto.randomUUID()}.pdf`;
  await storage.upload(objectPath, new Uint8Array(fixturePdf), "application/pdf");
  const doc = await createQueuedDocument({
    userId,
    originalFilename: "nda-test.pdf",
    sizeBytes: fixturePdf.length,
    sha256: crypto.randomUUID().replace(/-/g, ""),
    storagePath: objectPath,
  });
  return { doc, storage };
}

d("pipeline service integration", () => {
  afterAll(async () => {
    const { sql } = await getTestDb();
    await sql`DELETE FROM documents WHERE original_filename LIKE '%test%'`;
    await sql.end();
  });

  it("runs queued→ready with pages and verified citations persisted", async () => {
    const userId = crypto.randomUUID();
    const { doc, storage } = await seedQueuedDoc(userId);

    const out = await runDocumentPipeline(doc.id, {
      transport: okTransport(),
      storage,
    });
    expect(out.claimed).toBe(true);

    const afterRun = await getDocumentForUser(doc.id, userId);
    expect(afterRun?.status).toBe("ready");
    expect(afterRun?.pageCount).toBe(1);
    expect(afterRun?.errorCode).toBeNull();

    const pages = await (
      await getTestDb()
    ).sql`SELECT page_number, text FROM document_pages WHERE document_id = ${doc.id} ORDER BY page_number`;
    expect(pages).toHaveLength(1);
    expect(String(pages[0]!.text)).toContain("Receiving Party");

    const analysisRows = await (
      await getTestDb()
    ).sql`SELECT result, status FROM analyses WHERE document_id = ${doc.id}`;
    expect(analysisRows).toHaveLength(1);
    expect(analysisRows[0]!.status).toBe("complete");
    const resultJson = analysisRows[0]!.result as Record<string, unknown>;
    const concerns = resultJson.concerns as Array<{
      source: { verification?: string };
    }>;
    expect(concerns[0]!.source.verification).toBe("verified");
  });

  it("is idempotent — a second run claims nothing", async () => {
    const userId = crypto.randomUUID();
    const { doc, storage } = await seedQueuedDoc(userId);

    const first = await runDocumentPipeline(doc.id, {
      transport: okTransport(),
      storage,
    });
    expect(first.claimed).toBe(true);

    const second = await runDocumentPipeline(doc.id, {
      transport: okTransport(),
      storage,
    });
    expect(second.claimed).toBe(false);

    const analysisCount = await (
      await getTestDb()
    ).sql`SELECT count(*)::int AS n FROM analyses WHERE document_id = ${doc.id}`;
    expect(analysisCount[0]!.n).toBe(1);
  });

  it("maps corrupt bytes to failed(pdf_corrupt) and keeps the object", async () => {
    const userId = crypto.randomUUID();
    const storage = memoryStorage();
    const garbage = new Uint8Array(512);
    garbage.set(new TextEncoder().encode("%PDF-"), 0);
    crypto.getRandomValues(garbage.subarray(8));
    const objectPath = `${userId}/${crypto.randomUUID()}.pdf`;
    await storage.upload(objectPath, garbage, "application/pdf");

    const doc = await createQueuedDocument({
      userId,
      originalFilename: "corrupt-test.pdf",
      sizeBytes: garbage.length,
      sha256: crypto.randomUUID().replace(/-/g, ""),
      storagePath: objectPath,
    });

    await runDocumentPipeline(doc.id, { transport: okTransport(), storage });

    const failed = await getDocumentForUser(doc.id, userId);
    expect(failed?.status).toBe("failed");
    expect(failed?.errorCode).toBe("pdf_corrupt");
    expect(storage.objects.has(objectPath)).toBe(true);
  });

  it("maps gateway failure to a stable error code", async () => {
    const userId = crypto.randomUUID();
    const { doc, storage } = await seedQueuedDoc(userId);

    const failingTransport: GeminiTransport = {
      async generate() {
        throw Object.assign(new Error("429 quota"), { status: 429 });
      },
    };

    await runDocumentPipeline(doc.id, {
      transport: failingTransport,
      storage,
    });

    const failed = await getDocumentForUser(doc.id, userId);
    expect(failed?.status).toBe("failed");
    expect(failed?.errorCode).toBe("rate_limited");
  });

  it("scopes every read and write to the owning user", async () => {
    const owner = crypto.randomUUID();
    const stranger = crypto.randomUUID();
    const { doc } = await seedQueuedDoc(owner);

    expect(await getDocumentForUser(doc.id, stranger)).toBeNull();
    expect(await getDocumentForUser(doc.id, owner)).not.toBeNull();

    const ownList = await listDocumentsForUser(owner);
    expect(ownList.items.map((i) => i.id)).toContain(doc.id);
    const otherList = await listDocumentsForUser(stranger);
    expect(otherList.items.map((i) => i.id)).not.toContain(doc.id);

    expect(await softDeleteDocument(doc.id, stranger)).toBe(false);
    expect(await softDeleteDocument(doc.id, owner)).toBe(true);
    expect(await getDocumentForUser(doc.id, owner)).toBeNull();
  });

  it("classifies unknown failures as extraction_failed", () => {
    expect(mapPipelineFailure(new Error("boom"))).toBe("extraction_failed");
  });
});
