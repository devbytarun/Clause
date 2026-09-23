import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  getDocumentForUser,
  softDeleteDocument,
} from "@/lib/documents/repository";

export const GET = withAuth<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const doc = await getDocumentForUser(id, ctx.userId);
  if (!doc) return jsonError(404, "not_found");
  return jsonOk({
    id: doc.id,
    filename: doc.originalFilename,
    status: doc.status,
    errorCode: doc.errorCode,
    pageCount: doc.pageCount,
    charCount: doc.charCount,
    isScanned: doc.isScanned,
    sizeBytes: doc.sizeBytes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
});

export const DELETE = withAuth<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const ok = await softDeleteDocument(id, ctx.userId);
  if (!ok) return jsonError(404, "not_found");

  // Hard cleanup runs in the background; soft delete hides instantly.
  // No storage cleanup needed — PDFs are stored client-side only.
  after(async () => {
    await db.delete(documents).where(eq(documents.id, id));
  });

  return jsonOk({ ok: true });
});
