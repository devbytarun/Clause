import type { VerifiedSource } from "@/lib/schemas/workspace";

const STATE_META: Record<
  VerifiedSource["verification"],
  { label: string; className: string; title: string }
> = {
  verified: {
    label: "Verified",
    className: "border-hairline text-steel",
    title: "This exact text was found on the cited page.",
  },
  verified_fuzzy: {
    label: "Verified",
    className: "border-hairline text-steel",
    title: "Found on the cited page allowing for extraction artifacts.",
  },
  page_corrected: {
    label: "Corrected page",
    className: "border-cream-deeper bg-cream-deeper/40 text-ink-tint",
    title: "Quote found on a different page than the AI cited.",
  },
  unverified: {
    label: "Unverified",
    className: "border-cream-deeper bg-cream-deeper/60 text-ink-tint",
    title: "This reference could not be found in the document text. Treat with caution.",
  },
};

export function VerificationBadge({
  source,
}: {
  source: Pick<VerifiedSource, "verification" | "correctedPage">;
}) {
  const meta =
    source.verification === "page_corrected" && source.correctedPage
      ? {
          ...STATE_META.page_corrected,
          label: `Corrected to page ${source.correctedPage}`,
        }
      : STATE_META[source.verification];

  return (
    <span
      title={meta.title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      {source.verification === "verified" ||
      source.verification === "verified_fuzzy"
        ? "✓"
        : source.verification === "unverified"
          ? "?"
          : "→"}{" "}
      {meta.label}
    </span>
  );
}

export function PageBadgeLink({
  documentId,
  page,
}: {
  documentId: string;
  page: number;
}) {
  return (
    <a
      href={`/documents/${documentId}?page=${page}#page-panel`}
      className="inline-flex items-center rounded-md border border-hairline-strong px-2.5 py-1 text-xs font-medium text-ink no-underline transition-colors hover:bg-surface"
    >
      Page {page}
    </a>
  );
}
