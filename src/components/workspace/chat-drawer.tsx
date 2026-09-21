"use client";

import { useEffect, useRef, useState } from "react";
import type { VerifiedSource } from "@/lib/schemas/workspace";
import { stripEvidenceMarkers } from "@/lib/chat/prompts";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  sources?: VerifiedSource[];
}

const markdownComponents = {
  h1: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-2 mt-3 text-base font-bold text-ink">{children}</h1>
  ),
  h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-2 mt-3 text-sm font-bold text-ink">{children}</h2>
  ),
  h3: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-1.5 mt-2 text-sm font-semibold text-ink">{children}</h3>
  ),
  h4: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="mb-1 mt-1.5 text-xs font-semibold uppercase tracking-wider text-stone">{children}</h4>
  ),
  p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-2.5 ml-4 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-2.5 ml-4 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="my-2 border-l-2 border-primary pl-3 italic text-ink-tint">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-hairline" />,
  code: ({ children, className }: React.HTMLAttributes<HTMLElement>) => {
    const isBlock = className || (typeof children === "string" && children.includes("\n"));
    return isBlock ? (
      <pre className="my-2 overflow-x-auto rounded bg-surface-code p-2.5 font-mono text-xs text-white">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="rounded bg-cream-deeper/60 px-1.5 py-0.5 font-mono text-[12px] font-medium text-ink">
        {children}
      </code>
    );
  },
  table: ({ children }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full divide-y divide-hairline text-xs">{children}</table>
    </div>
  ),
  th: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="bg-cream/60 px-2 py-1 text-left font-semibold text-stone">{children}</th>
  ),
  td: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-t border-hairline-soft px-2 py-1 text-ink-tint">{children}</td>
  ),
};

const DISCLAIMER =
  "Document-grounded analysis & practical insights. Informational, not legal advice.";

export function ChatDrawer({
  documentId,
  suggestedQuestions,
  disabledReason,
}: {
  documentId: string;
  suggestedQuestions: string[];
  disabledReason: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // History loads once; survives reloads (blueprint §11).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/conversations/by-document/${documentId}/messages`
        );
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) {
          setMessages(body.messages as ChatMessage[]);
          setLoadedHistory(true);
        }
      } catch {
        /* history is additive; chat still works without it */
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [documentId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, streamText]);

  async function send(question: string) {
    if (!question.trim() || streaming) return;
    setError(null);
    setInput("");
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, role: "user", content: question },
    ]);
    setStreaming(true);
    setStreamText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/conversations/by-document/${documentId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: question }),
          signal: controller.signal,
        }
      );

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? "Chat is temporarily unavailable."
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      let finalSources: VerifiedSource[] = [];

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const lines = raw.split("\n");
          const event = lines.find((l) => l.startsWith("event: "))?.slice(7);
          const dataLine = lines.find((l) => l.startsWith("data: "))?.slice(6);
          if (!event || !dataLine) continue;
          const data = JSON.parse(dataLine);
          if (event === "delta") {
            assembled += data.t as string;
            setStreamText(stripEvidenceMarkers(assembled));
          } else if (event === "done") {
            finalSources = (data.sources ?? []) as VerifiedSource[];
            setMessages((m) => [
              ...m,
              {
                id: data.messageId as number,
                role: "assistant",
                content:
                  (data.content as string | undefined) ??
                  stripEvidenceMarkers(assembled),
                sources: finalSources,
              },
            ]);
            setStreamText("");
          } else if (event === "error") {
            throw new Error(
              data.code === "document_too_large"
                ? "Document too large for chat context."
                : data.code === "ai_capacity"
                  ? "The AI service has reached today's usage capacity. Please try again tomorrow."
                  : "The AI service could not answer. Your history is intact."
            );
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Chat failed. Retry with your last question."
        );
        // Keep the unsent question in the input for a simple retry path.
        setInput(question);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex h-full flex-col bg-canvas" aria-label="Document chat">
      {/* Messages Scroll Area */}
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {!loadedHistory && (
          <div className="flex h-32 items-center justify-center text-xs text-muted" aria-live="polite">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-hairline-strong border-t-primary mr-2" />
            <span>Loading conversation…</span>
          </div>
        )}

        {loadedHistory && messages.length === 0 && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-cream text-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-ink mb-1">Ask questions about this document</h3>
            <p className="text-xs text-steel max-w-sm mx-auto mb-5">
              Ask about specific terms, obligations, compensation, concerns, or questions to raise about this document.
            </p>

            {suggestedQuestions.length > 0 && (
              <div className="space-y-1.5 text-left max-w-md mx-auto">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone mb-2">Suggested prompts:</p>
                {suggestedQuestions.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-hairline-strong hover:bg-canvas text-left flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <span className="text-stone group-hover:text-primary transition-colors ml-2">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "max-w-[85%] bg-ink text-white rounded-tr-xs shadow-xs"
                  : "max-w-[92%] border border-hairline-soft bg-surface text-ink rounded-tl-xs shadow-xs"
              }`}
            >
              {m.role === "user" ? (
                <div className="whitespace-pre-wrap">{m.content}</div>
              ) : (
                <div className="text-sm leading-relaxed text-ink">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              )}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 border-t border-hairline-soft/80 pt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-semibold text-stone">Citations:</span>
                  {m.sources.map((s) => (
                    <div
                      key={`citation-${s.page}-${s.quote}`}
                      className="flex max-w-full items-start gap-1.5 rounded-lg border border-hairline bg-canvas px-2 py-1.5 text-[11px]"
                    >
                      <a
                        href={`?page=${s.correctedPage ?? s.page}#page-panel`}
                        className="shrink-0 font-semibold text-steel no-underline hover:text-ink"
                      >
                        Page {s.correctedPage ?? s.page}
                      </a>
                      <span
                        className={
                          s.verification === "unverified"
                            ? "text-primary"
                            : "text-stone"
                        }
                      >
                        {s.verification === "verified" ||
                        s.verification === "verified_fuzzy"
                          ? "✓"
                          : s.verification === "page_corrected"
                            ? "→"
                            : "?"}
                      </span>
                      {s.quote && (
                        <span className="min-w-0 truncate italic text-stone">
                          “{s.quote}”
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-tl-xs border border-hairline-soft bg-surface px-4 py-2.5 text-sm leading-relaxed shadow-xs">
              <div className="text-sm leading-relaxed text-ink">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {streamText || "…"}
                </ReactMarkdown>
                <span className="inline-block animate-pulse text-primary font-bold ml-1">▍</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-cream-deeper bg-cream px-4 py-2 text-xs text-primary-deep flex items-center justify-between" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-stone hover:text-ink font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Fixed Composer Bottom Bar */}
      <div className="border-t border-hairline-soft bg-canvas p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative flex items-end gap-2 rounded-lg border border-hairline-strong bg-canvas p-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <label htmlFor="chat-input" className="sr-only">
              Ask about this document
            </label>
            <textarea
              id="chat-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder={
                disabledReason ?? "Ask about this document, a clause, or an obligation (Enter to send)…"
              }
              disabled={Boolean(disabledReason) || streaming}
              maxLength={2000}
              className="min-h-[44px] max-h-32 flex-1 resize-none border-0 bg-transparent px-2.5 py-1 text-xs sm:text-sm outline-none placeholder:text-muted"
            />
            {streaming ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="h-8 rounded-md border border-hairline-strong bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-canvas shrink-0"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={Boolean(disabledReason) || input.trim().length === 0}
                className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-40 shrink-0 flex items-center gap-1"
              >
                <span>Send</span>
                <span className="text-[10px]">↵</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-center text-stone">
            {DISCLAIMER}
          </p>
        </form>
      </div>
    </div>
  );
}
