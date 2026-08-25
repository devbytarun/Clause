"use client";

import { useState } from "react";

export type TabId =
  | "overview"
  | "highlights"
  | "concerns"
  | "positives"
  | "questions";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "highlights", label: "Highlights" },
  { id: "concerns", label: "Concerns" },
  { id: "positives", label: "Positives" },
  { id: "questions", label: "Questions" },
];

export function AnalysisTabs({
  sections,
}: {
  sections: Record<TabId, React.ReactNode>;
}) {
  const [active, setActive] = useState<TabId>("overview");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Analysis sections"
        className="mb-5 flex flex-wrap gap-1 border-b border-hairline-soft"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              active === tab.id
                ? "-mb-px border-b-2 border-primary text-primary"
                : "text-steel hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{sections[active]}</div>
    </div>
  );
}
