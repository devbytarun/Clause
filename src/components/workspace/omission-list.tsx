"use client";

import { useState } from "react";
import { 
  ShieldAlert, 
  Check, 
  Copy, 
  FilePlus, 
  ChevronDown, 
  ChevronUp
} from "lucide-react";
import type { Omission } from "@/lib/schemas/analysis";

interface OmissionListProps {
  omissions: Omission[];
}

export function OmissionList({ omissions }: OmissionListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedEmailIndex, setCopiedEmailIndex] = useState<number | null>(null);

  const handleCopyClause = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyEmail = (title: string, clause: string, index: number) => {
    const email = `Hi team,\n\nWhile reviewing the agreement, we noticed that a standard protection regarding "${title}" is currently unaddressed.\n\nTo ensure clarity and customary risk protection, we propose adding the following provision:\n\n"${clause}"\n\nPlease let us know if this can be incorporated into the updated draft. Thank you!`;
    navigator.clipboard.writeText(email);
    setCopiedEmailIndex(index);
    setTimeout(() => setCopiedEmailIndex(null), 2000);
  };

  if (omissions.length === 0) {
    return (
      <div className="rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-8 text-center space-y-3">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#2E7D4F]/10 text-[#2E7D4F]">
          <Check className="h-5 w-5" />
        </div>
        <h3 className="font-['Georgia',serif] text-base font-semibold text-[#171714]">
          No Critical Omissions Detected
        </h3>
        <p className="text-[13px] text-[#646158] max-w-md mx-auto leading-relaxed">
          The negative-space scanner audited this document against standard archetypes. Standard baseline protections (term limits, confidentiality exceptions, and notice provisions) appear represented.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="rounded-[8px] border border-[#D8D2C6] bg-[#FFFDF7] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#B87316]/10 text-[#B87316] shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-['Georgia',serif] text-[15px] font-semibold text-[#171714]">
              {omissions.length} Missing {omissions.length === 1 ? "Protection" : "Protections"} Identified
            </h3>
            <p className="text-[12px] text-[#646158]">
              Standard clauses omitted from this document that leave one-sided exposure.
            </p>
          </div>
        </div>
        <div className="font-mono text-[11px] text-[#989388] border border-[#D8D2C6] px-2.5 py-1 rounded-[4px] bg-[#F3F0E8]">
          PLAYBOOK AUDIT
        </div>
      </div>

      {/* Omission Cards */}
      <div className="space-y-3">
        {omissions.map((omission, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <article
              key={idx}
              className="rounded-[8px] border border-[#D8D2C6] bg-[#FFFDF7] p-4 transition-all shadow-xs space-y-3"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-['Georgia',serif] text-[15px] font-bold text-[#171714]">
                    {omission.title}
                  </h4>
                  <span className="font-mono text-[10px] uppercase text-[#646158] border border-[#D8D2C6] bg-[#F3F0E8] px-1.5 py-0.5 rounded-[4px]">
                    {omission.category}
                  </span>
                </div>

                <span
                  className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] w-fit ${
                    omission.severity === "high"
                      ? "bg-[#C53B36]/10 text-[#C53B36] border border-[#C53B36]/20"
                      : omission.severity === "moderate"
                        ? "bg-[#B87316]/10 text-[#B87316] border border-[#B87316]/20"
                        : "bg-[#3157D5]/10 text-[#3157D5] border border-[#3157D5]/20"
                  }`}
                >
                  {omission.severity} Exposure
                </span>
              </div>

              {/* Grid: What is missing & Practical risk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[12px]">
                <div className="rounded-[6px] border border-[#D8D2C6]/60 bg-[#F3F0E8]/40 p-3">
                  <span className="font-mono text-[10px] font-bold uppercase text-[#646158] block mb-1">
                    What is Missing
                  </span>
                  <p className="text-[#171714] leading-relaxed">
                    {omission.missing_protection}
                  </p>
                </div>

                <div className="rounded-[6px] border border-[#D8D2C6]/60 bg-[#F3F0E8]/40 p-3">
                  <span className="font-mono text-[10px] font-bold uppercase text-[#C53B36] block mb-1">
                    Practical Exposure
                  </span>
                  <p className="text-[#646158] leading-relaxed">
                    {omission.practical_risk}
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D8D2C6]/50 pt-2.5">
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3157D5] hover:underline"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  <span>{isExpanded ? "Hide Suggested Clause" : "View Suggested Protective Clause"}</span>
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyEmail(omission.title, omission.suggested_clause, idx)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#171714] border border-[#D8D2C6] px-2.5 py-1 rounded-[4px] hover:bg-[#F3F0E8] transition-colors"
                >
                  {copiedEmailIndex === idx ? (
                    <>
                      <Check className="h-3 w-3 text-[#2E7D4F]" />
                      <span className="text-[#2E7D4F]">Email Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Draft Inclusion Request Email</span>
                    </>
                  )}
                </button>
              </div>

              {/* Expandable Suggested Clause */}
              {isExpanded && (
                <div className="rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase text-[#2E7D4F]">
                      Recommended Standard Language to Add:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyClause(omission.suggested_clause, idx)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#3157D5] hover:underline"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3 w-3 text-[#2E7D4F]" />
                          <span className="text-[#2E7D4F]">Copied Clause</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Clause</span>
                        </>
                      )}
                    </button>
                  </div>
                  <blockquote className="font-['Georgia',serif] text-[13px] italic leading-relaxed text-[#171714] border-l-2 border-[#2E7D4F] pl-3 py-0.5">
                    &ldquo;{omission.suggested_clause}&rdquo;
                  </blockquote>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
