import { createHash } from "node:crypto";
import { after } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  countRecentUploads,
  createQueuedDocument,
  findDuplicateForUser,
} from "@/lib/documents/repository";
import { getStorage } from "@/lib/storage";
import {
  hasPdfMagicBytes,
  MAX_SIZE_BYTES,
} from "@/lib/pipeline/document-processor";
import { runDocumentPipeline } from "@/lib/pipeline/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const UPLOAD_QUOTA_PER_HOUR = 10;

function badRequest(code:
  | "file_too_large"
  | "file_bad_type"
  | "file_empty") {
  return jsonError(code === "file_too_large" ? 413 : 415, code);
}

export const POST = withAuth(async (req: NextRequest, ctx) => {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("file_bad_type");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("file_bad_type");

  if (file.size === 0) return jsonError(415, "file_empty");
  if (file.size > MAX_SIZE_BYTES) return jsonError(413, "file_too_large");
  if (file.type && file.type !== "application/pdf") {
    return badRequest("file_bad_type");
  }

  // Simple per-user upload quota (fixed window).
  const hourAgo = new Date(Date.now() - 3600_000);
  const recent = await countRecentUploads(ctx.userId, hourAgo);
  if (recent >= UPLOAD_QUOTA_PER_HOUR) return jsonError(429, "rate_limited");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfMagicBytes(bytes)) return badRequest("file_bad_type");

  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const duplicate = await findDuplicateForUser(ctx.userId, sha256);
  if (duplicate) {
    return jsonOk(
      {
        duplicateOf: duplicate.id,
        message:
          "You have already uploaded a document identical to this one.",
      },
      409
    );
  }

  const docId = crypto.randomUUID();
  const storagePath = `${ctx.userId}/${docId}.pdf`;

  const storage = getStorage();
  await storage.upload(storagePath, bytes, "application/pdf");

  const created = await createQueuedDocument({
    userId: ctx.userId,
    originalFilename: sanitizeFilename(file.name),
    sizeBytes: bytes.length,
    sha256,
    storagePath,
  });

  after(async () => {
    await runDocumentPipeline(created.id).catch(() => undefined);
  });

  return jsonOk({ id: created.id, status: "queued" }, 201);
});

function sanitizeFilename(name: string): string {
  const trimmed = (name || "document.pdf").trim();
  return trimmed.replace(/[\r\n\0]/g, "").slice(0, 255) || "document.pdf";
}

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = await import("@/lib/documents/repository").then((m) =>
    m.listDocumentsForUser(ctx.userId, { q })
  );
  return jsonOk(page);
});
