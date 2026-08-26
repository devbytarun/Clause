"use client";

import { useEffect, useRef, useState } from "react";
import type { VerifiedSource } from "@/lib/schemas/workspace";

interface ChatMessage {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  sources?: VerifiedSource[];
}

const DISCLAIMER =
  "Chat answers come only from this document. Analysis is informational, not legal advice.";

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
            setStreamText(assembled);
          } else if (event === "done") {
            finalSources = (data.sources ?? []) as VerifiedSource[];
            setMessages((m) => [
              ...m,
              {
                id: data.messageId as number,
                role: "assistant",
                content: assembled,
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

  const showSuggestions = loadedHistory && messages.length === 0;

  return (
    <section className="rounded-lg border border-hairline-soft bg-canvas" aria-label="Document chat">
      <div className="border-b border-hairline-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone">
        Ask this document
      </div>

      <div ref={listRef} className="max-h-[420px] space-y-3 overflow-y-auto p-4">
        {!loadedHistory && (
          <p className="text-sm text-muted" aria-live="polite">
            Loading conversation…
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-white"
                  : "border border-hairline-soft bg-surface text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {m.sources.map((s) => (
                    <a
                      key={`badge-${s.page}`}
                      href={`?page=${s.page}#page-panel`}
                      className="rounded-full border border-hairline-strong px-2 py-0.5 text-[11px] font-medium no-underline text-steel transition-colors hover:bg-surface"
                    >
                      Page {s.page} ✓
                    </a>
                  ))}
                </p>
              )}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg border border-hairline-soft bg-surface px-3 py-2 text-sm leading-relaxed">
              <p className="whitespace-pre-wrap">
                {streamText || "…"}
                <span className="animate-pulse">▍</span>
              </p>
            </div>
          </div>
        )}

        {showSuggestions && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestedQuestions.slice(0, 4).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="rounded-full border border-hairline-strong bg-canvas px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="px-4 pb-1 text-xs leading-relaxed text-primary-deep">
          {error}
        </p>
      )}

      <p className="border-t border-cream-deeper bg-cream px-4 py-1.5 text-[11px] leading-relaxed text-ink-tint">
        {DISCLAIMER}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 p-3"
      >
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
            disabledReason ?? "Ask about the contents of this document…"
          }
          disabled={Boolean(disabledReason) || streaming}
          maxLength={2000}
          className="min-h-[44px] flex-1 resize-none rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-2 focus:border-primary focus:px-[10px]"
        />
        {streaming ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="h-11 rounded-md border border-hairline-strong px-4 text-sm font-medium transition-colors hover:bg-surface"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={Boolean(disabledReason) || input.trim().length === 0}
            className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-deep disabled:bg-hairline disabled:text-muted"
          >
            Send
          </button>
        )}
      </form>
    </section>
  );
}
