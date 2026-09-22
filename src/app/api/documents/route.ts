import { createHash } from "node:crypto";
import { after } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  createQueuedDocument,
  countActiveDocumentsForUser,
  findDuplicateForUser,
} from "@/lib/documents/repository";
import { getStorage } from "@/lib/storage";
import {
  hasPdfMagicBytes,
  MAX_SIZE_BYTES,
} from "@/lib/pipeline/document-processor";
import { runDocumentPipeline } from "@/lib/pipeline/service";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

function badRequest(code:
  | "file_too_large"
  | "file_bad_type"
  | "file_empty") {
  return jsonError(code === "file_too_large" ? 413 : 415, code);
}

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  // Reject oversized multipart requests before Next parses them into memory.
  if (contentLength > MAX_SIZE_BYTES + 1024 * 1024) {
    return badRequest("file_too_large");
  }

  const env = getEnv();
  const activeDocuments = await countActiveDocumentsForUser(ctx.userId);
  if (activeDocuments >= 2) {
    return Response.json(
      {
        error: {
          code: "rate_limited",
          message: "Two documents are already processing. Wait for one to finish before uploading another.",
          retryAfterSeconds: 60,
        },
      },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Per-workspace upload quota — fixed window, configurable in .env.
  const quota = await consumeRateLimit(
    `uploads:${ctx.userId}`,
    env.RATE_LIMIT_UPLOADS_PER_HOUR,
    3600
  );
  if (!quota.allowed) {
    return Response.json(
      {
        error: {
          code: "rate_limited",
          message: "Upload limit reached for this hour. Try again later.",
          retryAfterSeconds: quota.retryAfterSeconds,
        },
      },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } }
    );
  }

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

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfMagicBytes(bytes)) return badRequest("file_bad_type");

  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const confirmDuplicate =
    new URL(req.url).searchParams.get("confirm") === "1";

  if (!confirmDuplicate) {
    const duplicate = await findDuplicateForUser(ctx.userId, sha256);
    if (duplicate) {
      return jsonOk(
        {
          duplicateOf: duplicate.id,
          message:
            "You have already uploaded a document identical to this one. Upload again to store a separate copy.",
        },
        409
      );
    }
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
