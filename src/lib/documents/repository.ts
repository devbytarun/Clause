import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  analyses,
  documentPages,
  documents,
  type DocumentRow,
} from "@/db/schema";
import type { AnalysisResult } from "@/lib/schemas/analysis";

/**
 * All document queries are user-scoped at the SQL level (blueprint §13).
 * Callers pass userId from the session; client input never reaches here
 * as an ownership filter.
 */

export interface CreateDocumentInput {
  userId: string;
  originalFilename: string;
  sizeBytes: number;
  sha256: string;
  storagePath: string;
}

export async function createQueuedDocument(
  input: CreateDocumentInput
): Promise<DocumentRow> {
  const [row] = await db
    .insert(documents)
    .values({
      userId: input.userId,
      originalFilename: input.originalFilename,
      mimeType: "application/pdf",
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      storagePath: input.storagePath,
      status: "queued",
    })
    .returning();
  return row!;
}

export async function findDuplicateForUser(
  userId: string,
  sha256: string
): Promise<DocumentRow | null> {
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        eq(documents.sha256, sha256),
        isNull(documents.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function countActiveDocumentsForUser(userId: string): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        isNull(documents.deletedAt),
        inArray(documents.status, ["queued", "extracting", "analyzing"])
      )
    );
  return Number(rows[0]?.count ?? 0);
}

export async function getDocumentForUser(
  id: string,
  userId: string
): Promise<DocumentRow | null> {
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.userId, userId),
        isNull(documents.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export interface ListDocumentsPage {
  items: Array<
    Pick<
      DocumentRow,
      | "id"
      | "originalFilename"
      | "status"
      | "errorCode"
      | "pageCount"
      | "charCount"
      | "isScanned"
      | "sizeBytes"
      | "createdAt"
    >
  >;
  nextCursor: string | null;
}

export async function listDocumentsForUser(
  userId: string,
  options: { q?: string; cursor?: string; pageSize?: number } = {}
): Promise<ListDocumentsPage> {
  const pageSize = Math.min(options.pageSize ?? 20, 50);

  const conditions = [
    eq(documents.userId, userId),
    isNull(documents.deletedAt),
  ];
  if (options.q) {
    conditions.push(sql`${documents.originalFilename} ILIKE ${"%" + options.q + "%"}`);
  }
  // Opaque cursor = ISO timestamp of the last item on the previous page.
  if (options.cursor) {
    const cursorDate = new Date(options.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      conditions.push(sql`${documents.createdAt} < ${cursorDate}`);
    }
  }

  const rows = await db
    .select({
      id: documents.id,
      originalFilename: documents.originalFilename,
      status: documents.status,
      errorCode: documents.errorCode,
      pageCount: documents.pageCount,
      charCount: documents.charCount,
      isScanned: documents.isScanned,
      sizeBytes: documents.sizeBytes,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt))
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;

  return {
    items,
    nextCursor:
      hasMore && items.length > 0
        ? items[items.length - 1]!.createdAt.toISOString()
        : null,
  };
}

export async function softDeleteDocument(
  id: string,
  userId: string
): Promise<boolean> {
  const now = new Date();
  const updated = await db
    .update(documents)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(documents.id, id),
        eq(documents.userId, userId),
        isNull(documents.deletedAt)
      )
    )
    .returning({ id: documents.id });
  return updated.length > 0;
}

/** Idempotency guard (blueprint §8 step 6). Returns row when claimed. */
export async function claimQueuedDocument(
  id: string,
  expectedStatus: "queued"
): Promise<DocumentRow | null> {
  const now = new Date();
  const claimed = await db
    .update(documents)
    .set({
      status: "extracting",
      processingStartedAt: now,
      attempts: sql`${documents.attempts} + 1`,
      updatedAt: now,
    })
    .where(and(eq(documents.id, id), eq(documents.status, expectedStatus)))
    .returning();
  return claimed[0] ?? null;
}

export async function updateStatus(
  id: string,
  status: DocumentRow["status"],
  patch: Partial<Pick<DocumentRow, "pageCount" | "charCount" | "isScanned" | "errorCode">> = {}
): Promise<void> {
  await db
    .update(documents)
    .set({ status, updatedAt: new Date(), ...patch })
    .where(eq(documents.id, id));
}

export async function replacePages(
  documentId: string,
  pages: { pageNumber: number; text: string }[]
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(documentPages).where(eq(documentPages.documentId, documentId));
    if (pages.length > 0) {
      await tx.insert(documentPages).values(
        pages.map((p) => ({
          documentId,
          pageNumber: p.pageNumber,
          text: p.text,
        }))
      );
    }
  });
}

export async function upsertAnalysis(params: {
  documentId: string;
  modelId: string;
  result: AnalysisResult;
  inputTokens: number;
  outputTokens: number;
  summaryText: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(analyses).where(eq(analyses.documentId, params.documentId));
    await tx.insert(analyses).values({
      documentId: params.documentId,
      modelId: params.modelId,
      status: "complete",
      result: params.result,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      summaryText: params.summaryText,
    });
  });
}

export async function getStoragePath(
  id: string
): Promise<string | null> {
  const rows = await db
    .select({ storagePath: documents.storagePath })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return rows[0]?.storagePath ?? null;
}

export interface AnalysisWithModel {
  documentId: string;
  modelId: string;
  result: unknown;
  inputTokens: number | null;
  outputTokens: number | null;
}

/** Ownership-checked analysis read (blueprint §15). */
export async function getAnalysisForUser(
  documentId: string,
  userId: string
): Promise<AnalysisWithModel | null> {
  const rows = await db
    .select({
      documentId: documents.id,
      modelId: analyses.modelId,
      result: analyses.result,
      inputTokens: analyses.inputTokens,
      outputTokens: analyses.outputTokens,
    })
    .from(analyses)
    .innerJoin(documents, eq(analyses.documentId, documents.id))
    .where(
      and(
        eq(analyses.documentId, documentId),
        eq(documents.userId, userId),
        isNull(documents.deletedAt)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, result: row.result as unknown };
}

/** Ownership-checked single-page text (blueprint §15 pages endpoint). */
export async function getPageForUser(
  documentId: string,
  userId: string,
  pageNumber: number
): Promise<{ pageNumber: number; text: string } | null> {
  const rows = await db
    .select({ pageNumber: documentPages.pageNumber, text: documentPages.text })
    .from(documentPages)
    .innerJoin(documents, eq(documentPages.documentId, documents.id))
    .where(
      and(
        eq(documentPages.documentId, documentId),
        eq(documentPages.pageNumber, pageNumber),
        eq(documents.userId, userId),
        isNull(documents.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export interface PageSearchHit {
  pageNumber: number;
  /** Extract of the surrounding text around the first match. */
  snippet: string;
}

/**
 * Full-text search over extracted page text (blueprint §16: viewer
 * search uses the document_pages index, not the PDF text layer).
 */
export async function searchPagesForUser(
  documentId: string,
  userId: string,
  query: string,
  limit = 8
): Promise<PageSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return [];

  const rows = await db
    .select({
      pageNumber: documentPages.pageNumber,
      text: documentPages.text,
    })
    .from(documentPages)
    .innerJoin(documents, eq(documentPages.documentId, documents.id))
    .where(
      and(
        eq(documentPages.documentId, documentId),
        eq(documents.userId, userId),
        isNull(documents.deletedAt),
        sql`${documentPages.text} ILIKE ${"%" + escapedLike(trimmed) + "%"}`
      )
    )
    .orderBy(asc(documentPages.pageNumber))
    .limit(Math.min(limit, 20));

  const needle = trimmed.toLowerCase();
  return rows.map((row) => {
    const idx = row.text.toLowerCase().indexOf(needle);
    const start = Math.max(0, (idx === -1 ? 0 : idx) - 60);
    const end = Math.min(row.text.length, start + 180);
    const prefix = start > 0 ? "…" : "";
    return {
      pageNumber: row.pageNumber,
      snippet:
        prefix +
        row.text.slice(start, end).replace(/\s+/g, " ").trim() +
        (end < row.text.length ? "…" : ""),
    };
  });
}

function escapedLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
