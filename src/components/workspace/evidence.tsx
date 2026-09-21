import type { VerifiedSource } from "@/lib/schemas/workspace";

const STATE_META: Record<
  VerifiedSource["verification"],
  { label: string; className: string; title: string }
> = {
  verified: {
    label: "Verified",
    className: "border-[#2E7D4F]/30 bg-[#2E7D4F]/10 text-[#2E7D4F]",
    title: "This exact text was found on the cited page.",
  },
  verified_fuzzy: {
    label: "Verified",
    className: "border-[#2E7D4F]/30 bg-[#2E7D4F]/10 text-[#2E7D4F]",
    title: "Found on the cited page allowing for minor extraction spacing.",
  },
  page_corrected: {
    label: "Corrected page",
    className: "border-[#B87316]/30 bg-[#B87316]/10 text-[#B87316]",
    title: "Quote found on a different page than cited.",
  },
  unverified: {
    label: "Unverified",
    className: "border-[#C53B36]/30 bg-[#C53B36]/10 text-[#C53B36]",
    title: "This reference could not be found in document text. Treat with caution.",
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
      className={`inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${meta.className}`}
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
      className="inline-flex items-center rounded-[4px] border border-[#D8D2C6] bg-[#FFFDF7] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#171714] no-underline transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
    >
      Page {page}
    </a>
  );
}
