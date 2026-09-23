import { createHash } from "node:crypto";
import { describe, expect, it, afterAll } from "vitest";
import {
  TEST_DATABASE_URL,
  getTestDb,
} from "@/test-support/test-db";
import { buildTextPdf } from "@/test-support/pdf-writer";
import {
  createQueuedDocument,
  getDocumentForUser,
  listDocumentsForUser,
  softDeleteDocument,
  replacePages,
  updateStatus,
} from "@/lib/documents/repository";
import { processDocument } from "@/lib/pipeline/document-processor";
import {
  runAnalysisPipeline,
  mapPipelineFailure,
} from "@/lib/pipeline/service";
import type { GeminiTransport } from "@/lib/gemini/gateway";

const d = TEST_DATABASE_URL ? describe : describe.skip;

function emptyStream() {
  const iterator: AsyncIterableIterator<string> = {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    async next() {
      return { value: undefined, done: true as const };
    },
  };
  return { deltas: iterator, usage: () => ({ inputTokens: 0, outputTokens: 0 }) };
}

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
    async streamChat() {
      return emptyStream();
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

/**
 * Seed a document with extracted pages (mirrors the new upload flow:
 * PDF text is extracted inline, pages stored in DB, then analysis runs).
 */
async function seedAnalyzingDoc(userId: string) {
  await getTestDb();
  const pdfBytes = new Uint8Array(fixturePdf);
  const processed = await processDocument(pdfBytes);
  const sha256 = createHash("sha256").update(pdfBytes).digest("hex");

  const doc = await createQueuedDocument({
    userId,
    originalFilename: "nda-test.pdf",
    sizeBytes: fixturePdf.length,
    sha256,
    storagePath: `client-only/${userId}/${crypto.randomUUID()}`,
  });

  await replacePages(doc.id, processed.pages);
  await updateStatus(doc.id, "analyzing", {
    pageCount: processed.pageCount,
    charCount: processed.charCount,
    isScanned: processed.isScanned,
  });

  return { doc, pages: processed.pages, isScanned: processed.isScanned };
}

d("pipeline service integration", () => {
  afterAll(async () => {
    const { sql } = await getTestDb();
    await sql`DELETE FROM documents WHERE original_filename LIKE '%test%'`;
    await sql.end();
  });

  it("runs analyzing→ready with pages and verified citations persisted", async () => {
    const userId = crypto.randomUUID();
    const { doc, pages, isScanned } = await seedAnalyzingDoc(userId);

    await runAnalysisPipeline(doc.id, pages, isScanned, {
      transport: okTransport(),
    });

    const afterRun = await getDocumentForUser(doc.id, userId);
    expect(afterRun?.status).toBe("ready");
    expect(afterRun?.pageCount).toBe(1);
    expect(afterRun?.errorCode).toBeNull();

    const pageRows = await (
      await getTestDb()
    ).sql`SELECT page_number, text FROM document_pages WHERE document_id = ${doc.id} ORDER BY page_number`;
    expect(pageRows).toHaveLength(1);
    expect(String(pageRows[0]!.text)).toContain("Receiving Party");

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

  it("maps gateway failure to a stable error code", async () => {
    const userId = crypto.randomUUID();
    const { doc, pages, isScanned } = await seedAnalyzingDoc(userId);

    const failingTransport: GeminiTransport = {
      async generate() {
        throw Object.assign(new Error("429 quota"), { status: 429 });
      },
      async streamChat() {
        return emptyStream();
      },
    };

    await runAnalysisPipeline(doc.id, pages, isScanned, {
      transport: failingTransport,
    });

    const failed = await getDocumentForUser(doc.id, userId);
    expect(failed?.status).toBe("failed");
    expect(failed?.errorCode).toBe("rate_limited");
  });

  it("scopes every read and write to the owning user", async () => {
    const owner = crypto.randomUUID();
    const stranger = crypto.randomUUID();
    const { doc } = await seedAnalyzingDoc(owner);

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
