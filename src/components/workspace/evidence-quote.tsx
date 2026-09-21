import { PageBadgeLink, VerificationBadge } from "@/components/workspace/evidence";
import type { VerificationState } from "@/lib/schemas/analysis";

export function EvidenceQuote({
  documentId,
  source,
}: {
  documentId: string;
  source: {
    quote: string;
    page: number;
    verification?: VerificationState;
    correctedPage?: number;
  };
}) {
  const displayPage = source.correctedPage ?? source.page;
  return (
    <div className="mt-2.5 rounded-[6px] border border-[#D8D2C6] bg-[#F3F0E8]/40 p-3">
      <blockquote className="mb-2 border-l-2 border-[#3157D5] pl-2.5 text-[12px] font-['Georgia',serif] italic leading-relaxed text-[#171714]">
        &ldquo;{source.quote}&rdquo;
      </blockquote>
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <PageBadgeLink documentId={documentId} page={displayPage} />
        {source.verification && (
          <VerificationBadge
            source={{
              verification: source.verification,
              correctedPage: source.correctedPage,
            }}
          />
        )}
      </div>
    </div>
  );
}
