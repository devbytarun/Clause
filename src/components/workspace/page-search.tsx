"use client";

import { useEffect, useState } from "react";
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

  function handleChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setHits(null);
      setLoading(false);
    }
  }

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
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, documentId]);

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search document text…"
        className="h-9 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm outline-none placeholder:text-muted focus:border-2 focus:border-primary focus:px-[11px]"
      />
      {(loading || hits !== null) && (
        <div className="absolute left-0 right-0 top-10 z-10 rounded-md border border-hairline bg-canvas shadow-card">
          {loading && <p className="p-3 text-xs text-steel">Searching…</p>}
          {!loading && hits !== null && hits.length === 0 && (
            <p className="p-3 text-xs text-steel">No matches in this document.</p>
          )}
          {!loading &&
            hits?.map((hit) => (
              <button
                key={hit.pageNumber}
                type="button"
                onClick={() => {
                  onJump(hit.pageNumber);
                  setHits(null);
                  setQuery("");
                }}
                className="block w-full border-b border-hairline-soft p-3 text-left last:border-0 hover:bg-surface"
              >
                <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Page {hit.pageNumber}
                </span>
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
