import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { pruneRateWindows } from "@/lib/rate-limit";
import { purgeExpiredDocuments } from "@/lib/documents/retention";

/**
 * Nightly cleanup cron (blueprint §14/§22): hard-deletes soft-deleted
 * documents and expired documents, then prunes rate-limit windows.
 *
 * Auth: shared secret bearer token (CRON_SECRET) — no user session.
 * PDFs are stored client-side so no storage cleanup is needed.
 */

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const presented = header.replace(/^Bearer\s+/i, "");
  if (presented.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= secret.charCodeAt(i) ^ presented.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const purged: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  const expired = await purgeExpiredDocuments();
  purged.push(...expired.purged);
  failed.push(...expired.failed);

  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(isNotNull(documents.deletedAt))
    .limit(200);

  for (const row of rows) {
    try {
      await db.delete(documents).where(eq(documents.id, row.id));
      purged.push(row.id);
    } catch (err) {
      failed.push({
        id: row.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const windowsPruned = await pruneRateWindows(
    new Date(Date.now() - 86_400_000)
  );

  return Response.json({
    purgedCount: purged.length,
    failed,
    windowsPruned,
    ranAt: new Date().toISOString(),
  });
}
