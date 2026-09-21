"use client";

import { useEffect, useRef, useState } from "react";
import type { PageSearchHit } from "@/lib/documents/repository";

export function PageSearch({
  documentId,
  onJump,
}: {
  documentId: string;
  onJump: (page: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PageSearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setHits(null);
      setLoading(false);
      setOpen(false);
    } else {
      setOpen(true);
    }
  }

  function handleClear() {
    setQuery("");
    setHits(null);
    setLoading(false);
    setOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/documents/${documentId}/pages/search?q=${encodeURIComponent(trimmed)}`
        );
        if (res.ok) {
          const body = await res.json();
          setHits(body.hits as PageSearchHit[]);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, documentId]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <svg
          className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-stone"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={query}
          onFocus={() => {
            if (hits !== null || query.trim().length >= 2) setOpen(true);
          }}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search text in PDF…"
          aria-label="Search document text"
          className="h-8 w-full rounded-md border border-hairline-strong bg-canvas pl-8 pr-7 text-xs outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2 flex h-4 w-4 items-center justify-center rounded-full text-stone hover:bg-hairline hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {open && (loading || hits !== null) && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-72 max-h-72 overflow-y-auto rounded-lg border border-hairline-soft bg-canvas shadow-modal sm:w-80">
          <div className="border-b border-hairline-soft bg-surface px-3 py-1.5 text-[11px] font-medium text-stone flex items-center justify-between">
            <span>Search Results</span>
            {hits && <span>{hits.length} matches</span>}
          </div>
          {loading && <p className="p-3 text-xs text-steel">Searching pages…</p>}
          {!loading && hits !== null && hits.length === 0 && (
            <p className="p-4 text-xs text-steel text-center">No matches found in this document.</p>
          )}
          {!loading &&
            hits?.map((hit) => (
              <button
                key={hit.pageNumber}
                type="button"
                onClick={() => {
                  onJump(hit.pageNumber);
                  setOpen(false);
                }}
                className="block w-full border-b border-hairline-soft p-2.5 text-left transition-colors last:border-0 hover:bg-surface focus-visible:outline-none focus-visible:bg-surface focus-visible:ring-1 focus-visible:ring-primary"
              >
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Page {hit.pageNumber}
                  </span>
                  <span className="text-[10px] text-stone">Jump →</span>
                </div>
                <span className="line-clamp-2 block text-xs leading-relaxed text-ink-tint">
                  {hit.snippet}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
