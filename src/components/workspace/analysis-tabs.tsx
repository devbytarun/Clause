"use client";

import { useState } from "react";
import {
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  MessageSquare
} from "lucide-react";

export type TabId =
  | "overview"
  | "highlights"
  | "concerns"
  | "positives"
  | "chat";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "concerns", label: "Concerns", icon: AlertTriangle },
  { id: "highlights", label: "Highlights", icon: Sparkles },
  { id: "positives", label: "Positives", icon: CheckCircle2 },
  { id: "chat", label: "Q&A", icon: MessageSquare },
];

export function AnalysisTabs({
  sections,
  counts = {},
  defaultTab = "overview",
}: {
  sections: Record<TabId, React.ReactNode>;
  counts?: Partial<Record<TabId, number>>;
  defaultTab?: TabId;
}) {
  const [active, setActive] = useState<TabId>(defaultTab);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] overflow-hidden shadow-xs">
      {/* Analysis Tab Header */}
      <div
        role="tablist"
        aria-label="Document analysis sections"
        aria-orientation="horizontal"
        className="flex shrink-0 items-stretch overflow-x-auto border-b border-[#D8D2C6] bg-[#F3F0E8]/50 px-1 pt-1 no-scrollbar touch-pan-x sm:px-2 sm:pt-2.5"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const count = counts[tab.id];
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`analysis-tab-${tab.id}`}
              aria-controls={`analysis-panel-${tab.id}`}
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={`${
                tab.id === "chat" ? "hidden lg:flex" : "flex"
              } min-h-11 min-w-[88px] shrink-0 items-center justify-center gap-1 px-2 py-2 text-[10px] font-mono font-bold transition-all rounded-t-[6px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] sm:min-w-0 sm:flex-1 sm:px-1.5 sm:text-[11px] ${
                isActive
                  ? "-mb-px border-t border-x border-[#D8D2C6] bg-[#FFFDF7] text-[#171714] shadow-xs"
                  : "text-[#646158] hover:text-[#171714] hover:bg-[#FFFDF7]/60"
              }`}
            >
              <Icon aria-hidden="true" className={`h-3.5 w-3.5 max-[420px]:hidden ${
                isActive
                  ? tab.id === "concerns" ? "text-[#F04D35]" : "text-[#3157D5]"
                  : "text-[#989388]"
              }`} />
              <span>{tab.label}</span>
              {typeof count === "number" && count > 0 && (
                <span
                  className={`font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded-[4px] tabular-nums ${
                    isActive
                      ? tab.id === "concerns"
                          ? "bg-[#F04D35]/10 text-[#F04D35] border border-[#F04D35]/30"
                          : "bg-[#3157D5]/10 text-[#3157D5] border border-[#3157D5]/30"
                      : "bg-[#D8D2C6]/60 text-[#646158]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panel Body */}
      <div
        role="tabpanel"
        id={`analysis-panel-${active}`}
        aria-labelledby={`analysis-tab-${active}`}
        tabIndex={0}
        className={`no-scrollbar min-h-0 min-w-0 flex-1 overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3157D5] ${
          active === "chat" ? "flex flex-col overflow-hidden p-0" : "overflow-y-auto p-5 sm:p-6"
        }`}
      >
        {sections[active]}
      </div>
    </div>
  );
}
