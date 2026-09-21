"use client";

import { useState } from "react";
import { 
  GitPullRequest, 
  ChevronDown, 
  ChevronUp
} from "lucide-react";
import type { Concern } from "@/lib/schemas/analysis";
import type { VerifiedSource } from "@/lib/schemas/workspace";
import { EvidenceQuote } from "./evidence-quote";
import { RedlinePanel } from "./redline-panel";

interface ConcernItemProps {
  documentId: string;
  concern: Concern & { source: VerifiedSource };
}

export function ConcernItem({ documentId, concern }: ConcernItemProps) {
  const [showRedline, setShowRedline] = useState(false);

  return (
    <article className="rounded-[8px] border border-[#D8D2C6] bg-[#FFFDF7] p-4 shadow-xs space-y-3 transition-all hover:border-[#989388]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="font-['Georgia',serif] text-[15px] font-bold text-[#171714]">
          {concern.title}
        </h3>
        <span
          className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] w-fit ${
            concern.priority === "high"
              ? "bg-[#C53B36]/10 text-[#C53B36] border border-[#C53B36]/20"
              : concern.priority === "moderate"
                ? "bg-[#B87316]/10 text-[#B87316] border border-[#B87316]/20"
                : "bg-[#646158]/10 text-[#646158] border border-[#D8D2C6]"
          }`}
        >
          {concern.priority} Attention
        </span>
      </header>

      {/* Tripartite Grid */}
      <div className="grid gap-2 text-[12px] md:grid-cols-3">
        <div className="rounded-[6px] border border-[#D8D2C6]/60 bg-[#F3F0E8]/40 p-2.5">
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#2E7D4F]">
            1. Document Fact
          </p>
          <p className="leading-relaxed text-[#171714]">{concern.document_fact}</p>
        </div>
        <div className="rounded-[6px] border border-[#D8D2C6]/60 bg-[#F3F0E8]/40 p-2.5">
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#646158]">
            2. Interpretation
          </p>
          <p className="leading-relaxed text-[#646158]">{concern.interpretation}</p>
        </div>
        <div className="rounded-[6px] border border-[#D8D2C6]/60 bg-[#F3F0E8]/40 p-2.5">
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#B87316]">
            3. Uncertainty
          </p>
          <p className="leading-relaxed text-[#646158]">{concern.uncertainty}</p>
        </div>
      </div>

      {/* Plain English */}
      <p className="text-[13px] leading-relaxed text-[#646158]">
        <strong className="text-[#171714]">Plain English:</strong> {concern.plain_english}
      </p>

      {/* Citation Quote */}
      <EvidenceQuote documentId={documentId} source={concern.source} />

      {/* Counter-Offer Toggle Action */}
      <div className="border-t border-[#D8D2C6]/60 pt-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowRedline(!showRedline)}
          className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] ${
            showRedline
              ? "bg-[#171714] text-[#FFFDF7]"
              : "border border-[#F04D35] bg-[#F04D35]/5 text-[#F04D35] hover:bg-[#F04D35] hover:text-[#FFFDF7]"
          }`}
        >
          <GitPullRequest className="h-3.5 w-3.5" />
          <span>{showRedline ? "Hide Counter-Proposal" : "Propose Redline & Counter-Offer"}</span>
          {showRedline ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
        </button>

        <span className="font-mono text-[10px] text-[#989388]">
          READY-TO-SEND EMAIL
        </span>
      </div>

      {/* Redline Panel Drawer */}
      {showRedline && (
        <div className="mt-3 pt-1">
          <RedlinePanel
            concernTitle={concern.title}
            originalQuote={concern.source.quote}
            redline={concern.redline}
            onClose={() => setShowRedline(false)}
          />
        </div>
      )}
    </article>
  );
}
