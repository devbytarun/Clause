/**
 * Context assembly for grounded chat (blueprint §11).
 *
 * Hard budgets, drop-to-fail on document overflow (never silently
 * truncate clauses), oldest-first history trimming with the current
 * question always kept. Token counts are estimated at 4 chars/token —
 * deliberately conservative and dependency-free.
 *
 * Retrieval seam: a future RetrievalContextBuilder (pgvector over
 * document_pages) can implement the same interface without touching
 * ChatService.
 */

export const DOC_TEXT_CAP_TOKENS = 110_000;
export const HISTORY_MAX_MESSAGES = 12;
export const HISTORY_CAP_TOKENS = 6_000;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface ContextPage {
  pageNumber: number;
  text: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BuiltChatContext {
  /** Page-marked, sanitized document text (may be null for scanned docs). */
  documentBlock: string | null;
  historyWindow: ChatHistoryMessage[];
  droppedHistoryCount: number;
  estimatedInputTokens: number;
}

export class DocumentTooLargeForChatError extends Error {
  constructor() {
    super("Document text exceeds the chat context budget");
    this.name = "DocumentTooLargeForChatError";
  }
}

export function buildChatContext(input: {
  pages: ContextPage[];
  isScanned: boolean;
  summaryText: string | null;
  history: ChatHistoryMessage[];
}): BuiltChatContext {
  // 1. Document block — full text or fail; scanned docs get a notice instead.
  let documentBlock: string | null = null;
  if (!input.isScanned) {
    const body = input.pages
      .map(
        (p) => `=== PAGE ${p.pageNumber} ===\n${sanitizeForContext(p.text)}`
      )
      .join("\n\n");
    if (estimateTokens(body) > DOC_TEXT_CAP_TOKENS) {
      throw new DocumentTooLargeForChatError();
    }
    documentBlock = `<document>\n${body}\n</document>`;
  }

  // 2. History window — newest kept, oldest dropped under either budget.
  const capped = input.history.slice(-HISTORY_MAX_MESSAGES);
  let droppedHistoryCount = input.history.length - capped.length;
  const window: ChatHistoryMessage[] = [];
  let used = 0;
  for (let i = capped.length - 1; i >= 0; i--) {
    const msg = capped[i]!;
    const cost = estimateTokens(msg.content);
    if (used + cost > HISTORY_CAP_TOKENS) {
      if (window.length === 0) {
        // Single oversized message — skip it, keep scanning older ones.
        droppedHistoryCount++;
        continue;
      }
      // Everything older than what already fits is dropped.
      droppedHistoryCount += i + 1;
      break;
    }
    used += cost;
    window.unshift(msg);
  }

  const summaryPart = input.summaryText
    ? `\n\nAnalysis summary: ${input.summaryText.slice(0, 3200)}`
    : "";

  const estimatedInputTokens =
    estimateTokens(documentBlock ?? "") +
    estimateTokens(summaryPart) +
    used;

  return { documentBlock, historyWindow: window, droppedHistoryCount, estimatedInputTokens };
}

/** Same neutralization as pipeline markers, scoped for chat context. */
function sanitizeForContext(text: string): string {
  return text
    .replace(/<\/?\s*document[^>]*>/gi, "[marker removed]")
    .replace(/\[\s*PAGE\s+\d+\s*\]/gi, "[marker removed]")
    .replace(/={2,}\s*PAGE\s+\d+\s*={2,}/gi, "[marker removed]");
}
