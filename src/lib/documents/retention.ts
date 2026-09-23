import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getEnv } from "@/lib/env";

export interface RetentionSweepResult {
  cutoff: Date;
  purged: string[];
  failed: Array<{ id: string; reason: string }>;
}

/**
 * Hard-delete active documents older than the configured retention window.
 * PDFs are stored client-side, so only database rows need cleanup.
 */
export async function purgeExpiredDocuments(
  userId?: string
): Promise<RetentionSweepResult> {
  const retentionDays = getEnv().DOCUMENT_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const conditions = [isNull(documents.deletedAt), lt(documents.createdAt, cutoff)];

  if (userId) {
    conditions.push(eq(documents.userId, userId));
  }

  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(...conditions));

  const purged: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  for (const row of rows) {
    try {
      await db
        .delete(documents)
        .where(and(eq(documents.id, row.id), isNull(documents.deletedAt)));
      purged.push(row.id);
    } catch (err) {
      failed.push({
        id: row.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { cutoff, purged, failed };
}
