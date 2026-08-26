"use client";

import { useEffect, useRef, useState } from "react";
import { PageSearch } from "@/components/workspace/page-search";
import { errorMessage } from "@/lib/error-codes";

/**
 * PDF viewer pane (blueprint §16/Phase 5).
 *
 * Uses the browser-native PDF renderer against a server-issued signed
 * URL (#page=N fragment jumps). Signed URLs are refreshed well before
 * their TTL expires so long reading sessions don't break.
 */
export function PdfPane({
  documentId,
  initialPage,
  pageCount,
}: {
  documentId: string;
  initialPage: number;
  pageCount: number | null;
}) {
  const [page, setPage] = useState(initialPage);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const issuedAtRef = useRef(0);

  async function loadSignedUrl() {
    try {
      const res = await fetch(`/api/documents/${documentId}/file`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ??
            errorMessage("storage_unavailable") ??
            "Viewer unavailable"
        );
      }
      const body = await res.json();
      setSignedUrl(body.url as string);
      issuedAtRef.current = Date.now();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Viewer unavailable");
    }
  }

  useEffect(() => {
    // Deferred so state updates never run synchronously within the effect.
    const boot = setTimeout(() => void loadSignedUrl(), 0);
    // Refresh the signed URL every 10 minutes (TTL is 15).
    const timer = setInterval(() => {
      if (Date.now() - issuedAtRef.current > 600_000) void loadSignedUrl();
    }, 60_000);
    return () => {
      clearTimeout(boot);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const maxPage = pageCount ?? 1;
  const canPrev = page > 1;
  const canNext = page < maxPage;

  return (
    <div className="flex h-full flex-col rounded-lg border border-hairline-soft bg-surface">
      <div className="flex items-center gap-2 border-b border-hairline-soft p-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-hairline-strong px-2 py-1 text-sm transition-colors hover:bg-canvas disabled:text-muted"
          >
            ←
          </button>
          <span className="min-w-[72px] text-center text-xs font-medium text-steel">
            Page {page}
            {pageCount ? ` / ${pageCount}` : ""}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            className="rounded-md border border-hairline-strong px-2 py-1 text-sm transition-colors hover:bg-canvas disabled:text-muted"
          >
            →
          </button>
        </div>
        <div className="ml-auto w-56">
          <PageSearch documentId={documentId} onJump={(p) => setPage(p)} />
        </div>
      </div>

      <div className="relative min-h-[480px] flex-1">
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-ink-tint">{error}</p>
            <button
              type="button"
              onClick={() => void loadSignedUrl()}
              className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm font-medium transition-colors hover:bg-canvas"
            >
              Reload
            </button>
          </div>
        )}
        {!error && !signedUrl && (
          <div
            className="flex h-full items-center justify-center text-sm text-steel"
            role="status"
            aria-live="polite"
          >
            Loading viewer…
          </div>
        )}
        {!error && signedUrl && (
          <iframe
            key={`${signedUrl}#${page}`}
            title={`PDF viewer — page ${page}`}
            src={`${signedUrl}#page=${page}`}
            className="h-[calc(100vh-220px)] min-h-[480px] w-full rounded-b-lg bg-canvas"
          />
        )}
      </div>
    </div>
  );
}
