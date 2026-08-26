import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  conversations,
  documentPages,
  documents,
  messages,
  analyses,
} from "@/db/schema";
import type { VerifiedSource } from "@/lib/schemas/workspace";
import {
  buildChatContext,
  DocumentTooLargeForChatError,
  type ChatHistoryMessage,
} from "@/lib/chat/context-builder";
import {
  buildChatSystemInstruction,
  extractPageReferences,
  POST_DOCUMENT_REMINDER,
} from "@/lib/chat/prompts";
import { createGeminiGateway, GatewayError } from "@/lib/gemini/gateway";

/**
 * ChatService (blueprint §11): one conversation per document, created
 * lazily; full-document context with budgets; streamed answers whose
 * page references are validated before persistence.
 */

export class ChatNotReadyError extends Error {}

export async function getOrCreateConversation(
  documentId: string,
  userId: string
): Promise<string> {
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.documentId, documentId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);
  if (existing[0]) return existing[0].id;

  const inserted = await db
    .insert(conversations)
    .values({ documentId, userId })
    .onConflictDoNothing({ target: conversations.documentId })
    .returning({ id: conversations.id });
  if (inserted[0]) return inserted[0].id;

  // Raced with a concurrent creation — fetch the winner.
  const winner = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.documentId, documentId))
    .limit(1);
  if (!winner[0]) throw new Error("conversation_create_failed");
  return winner[0].id;
}

export interface LoadedChatDocument {
  conversationId: string;
  pages: { pageNumber: number; text: string }[];
  validPages: Set<number>;
  summaryText: string | null;
  isScanned: boolean;
}

/** Ownership-checked load of everything a chat turn needs. */
export async function loadChatDocument(
  documentId: string,
  userId: string
): Promise<LoadedChatDocument | null> {
  const docRows = await db
    .select({
      id: documents.id,
      status: documents.status,
      isScanned: documents.isScanned,
    })
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.userId, userId),
        isNull(documents.deletedAt)
      )
    )
    .limit(1);
  const doc = docRows[0];
  if (!doc || doc.status !== "ready") return null;

  const [convId, pages, analysisRows] = await Promise.all([
    getOrCreateConversation(documentId, userId),
    db
      .select({
        pageNumber: documentPages.pageNumber,
        text: documentPages.text,
      })
      .from(documentPages)
      .where(eq(documentPages.documentId, documentId))
      .orderBy(asc(documentPages.pageNumber)),
    db
      .select({ summaryText: analyses.summaryText })
      .from(analyses)
      .where(eq(analyses.documentId, documentId))
      .limit(1),
  ]);

  return {
    conversationId: convId,
    pages,
    validPages: new Set(pages.map((p) => p.pageNumber)),
    summaryText: analysisRows[0]?.summaryText ?? null,
    isScanned: doc.isScanned,
  };
}

export async function listMessages(
  conversationId: string,
    options: { beforeId?: number; limit?: number } = {}
) {
  const limit = Math.min(options.limit ?? 50, 100);
  const conditions = [eq(messages.conversationId, conversationId)];
  if (options.beforeId !== undefined) {
    conditions.push(lt(messages.id, options.beforeId));
  }
  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(sql`${messages.id} DESC`)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    messages: page.reverse(), // chronological for the client
    nextBeforeId:
      hasMore && page.length > 0 ? page[0]!.id : null,
  };
}

export interface StreamChatTurnOptions {
  onDelta: (text: string) => void;
  transport?: Parameters<typeof createGeminiGateway>[0];
}

export type StreamChatTurnResult =
  | {
      ok: true;
      messageId: number;
      sources: VerifiedSource[];
      inputTokens: number;
      outputTokens: number;
    }
  | { ok: false; code: "not_ready" | "document_too_large" | GatewayError["code"]; message?: string };

/** Runs one grounded chat turn end-to-end and persists both messages. */
export async function streamChatTurn(
  documentId: string,
  userId: string,
  question: string,
  options: StreamChatTurnOptions
): Promise<StreamChatTurnResult> {
  const loaded = await loadChatDocument(documentId, userId);
  if (!loaded) return { ok: false, code: "not_ready" };

  let context;
  try {
    const history = await listMessages(loaded.conversationId);
    context = buildChatContext({
      pages: loaded.pages,
      isScanned: loaded.isScanned,
      summaryText: loaded.summaryText,
      history: history.messages.map((m) => ({
        role: m.role as ChatHistoryMessage["role"],
        content: m.content,
      })),
    });
  } catch (err) {
    if (err instanceof DocumentTooLargeForChatError) {
      return { ok: false, code: "document_too_large" };
    }
    throw err;
  }

  await db.insert(messages).values({
    conversationId: loaded.conversationId,
    role: "user",
    content: question,
  });

  const userPrompt = [
    context.documentBlock ?? "(No text layer available — scanned document.)",
    loaded.summaryText
      ? `Analysis summary for orientation: ${loaded.summaryText}`
      : "",
    "",
    `Conversation so far (${context.historyWindow.length} prior messages):`,
    ...context.historyWindow.map(
      (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
    ),
    "",
    `User's new question: ${question}`,
    POST_DOCUMENT_REMINDER,
  ]
    .filter((part) => part !== "")
    .join("\n");

  const gateway = createGeminiGateway(options.transport);

  let outcome;
  try {
    outcome = await gateway.chatStream(
      {
        systemInstruction: buildChatSystemInstruction(),
        userPrompt,
      },
      options.onDelta
    );
  } catch (err) {
    const code =
      err instanceof GatewayError ? err.code : "provider_error";
    return { ok: false, code };
  }

  const sources = extractPageReferences(outcome.text, loaded.validPages);

  const inserted = await db
    .insert(messages)
    .values({
      conversationId: loaded.conversationId,
      role: "assistant",
      content: outcome.text,
      sources,
      inputTokens: outcome.inputTokens,
      outputTokens: outcome.outputTokens,
    })
    .returning({ id: messages.id });

  return {
    ok: true,
    messageId: inserted[0]!.id,
    sources,
    inputTokens: outcome.inputTokens,
    outputTokens: outcome.outputTokens,
  };
}
