"use client";

import { useEffect, useRef, useState } from "react";
import { PageSearch } from "@/components/workspace/page-search";
import { errorMessage } from "@/lib/error-codes";

/**
 * PDF viewer pane.
 * Uses browser-native PDF renderer against a signed URL.
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
    const boot = setTimeout(() => void loadSignedUrl(), 0);
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
    <div className="flex h-full flex-col rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] overflow-hidden shadow-xs">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#D8D2C6] bg-[#F3F0E8]/50 px-2.5 py-2 sm:flex sm:flex-wrap sm:justify-between sm:px-3.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[#D8D2C6] bg-[#FFFDF7] font-mono text-[11px] font-bold text-[#171714] transition-colors hover:bg-[#F3F0E8] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3157D5]"
          >
            ←
          </button>
          <span className="min-w-[70px] text-center font-mono text-[11px] text-[#646158]">
            Page <span className="font-bold text-[#171714]">{page}</span>
            {pageCount ? ` / ${pageCount}` : ""}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[#D8D2C6] bg-[#FFFDF7] font-mono text-[11px] font-bold text-[#171714] transition-colors hover:bg-[#F3F0E8] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3157D5]"
          >
            →
          </button>
        </div>
        <div className="min-w-0 sm:w-56">
          <PageSearch documentId={documentId} onJump={(p) => setPage(p)} />
        </div>
        {signedUrl && (
          <a
            href={`${signedUrl}#page=${page}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-[4px] border border-[#D8D2C6] bg-[#FFFDF7] px-2.5 py-1.5 font-mono text-[10px] font-bold text-[#171714] no-underline hover:bg-[#F3F0E8]"
          >
            Open PDF
          </a>
        )}
      </div>

      <div className="relative min-h-0 flex-1 bg-[#FFFDF7] lg:min-h-[480px]">
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-[13px] text-[#646158]">{error}</p>
            <button
              type="button"
              onClick={() => void loadSignedUrl()}
              className="rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-3.5 py-1.5 font-mono text-[11px] font-bold text-[#171714] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
            >
              Reload Viewer
            </button>
          </div>
        )}
        {!error && !signedUrl && (
          <div
            className="flex h-full flex-col items-center justify-center gap-2 font-mono text-[11px] text-[#646158]"
            role="status"
            aria-live="polite"
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#D8D2C6] border-t-[#F04D35]" />
            <span>Loading PDF document…</span>
          </div>
        )}
        {!error && signedUrl && (
          <object
            key={`${signedUrl}#${page}`}
            data={`${signedUrl}#page=${page}`}
            type="application/pdf"
            aria-label={`PDF viewer — page ${page}`}
            className="h-full w-full bg-[#FFFDF7]"
          >
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-[13px] text-[#646158]">
                This browser cannot render the PDF inline.
              </p>
              <a
                href={`${signedUrl}#page=${page}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-[6px] bg-[#F04D35] px-4 py-2 font-mono text-[11px] font-bold text-[#FFFDF7] no-underline hover:bg-[#C93625]"
              >
                Open PDF
              </a>
            </div>
          </object>
        )}
      </div>
    </div>
  );
}
