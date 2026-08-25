import { describe, expect, it } from "vitest";
import { applyPolicyFilter } from "@/lib/pipeline/policy-filter";
import type { AnalysisResult } from "@/lib/schemas/analysis";

function baseResult(): AnalysisResult {
  return {
    overview: {
      document_type: null,
      parties: [],
      dates: [],
      compensation: null,
      duration: null,
      notice_period: null,
      probation: null,
      location: null,
      hours: null,
      benefits: [],
      deadlines: [],
    },
    highlights: [
      {
        title: "Notice period",
        explanation: "The document sets a sixty day notice period.",
        source: { page: 1, quote: "sixty days" },
      },
    ],
    positive_points: [],
    concerns: [
      {
        title: "Broad confidentiality",
        priority: "moderate",
        document_fact: "Confidential information is not limited by marking.",
        interpretation: "This may cover information shared casually.",
        uncertainty: "Court treatment of unmarked information varies.",
        plain_english: "Everything you share could count as confidential.",
        source: { page: 2, quote: "whether marked confidential or not" },
      },
    ],
    questions_to_ask: [
      {
        question: "How is confidential information defined?",
        rationale: "The definition affects what you may discuss later.",
      },
    ],
  };
}

describe("applyPolicyFilter", () => {
  it("keeps compliant items untouched", () => {
    const out = applyPolicyFilter(baseResult());
    expect(out.removedItems).toBe(0);
    expect(out.result.highlights).toHaveLength(1);
    expect(out.result.concerns).toHaveLength(1);
  });

  it("drops concerns containing legal verdicts", () => {
    const r = baseResult();
    r.concerns[0]!.plain_english = "This clause is illegal in most places.";
    const out = applyPolicyFilter(r);
    expect(out.removedItems).toBe(1);
    expect(out.result.concerns).toHaveLength(0);
  });

  it("drops items asserting enforceability conclusions", () => {
    const r = baseResult();
    r.highlights[0]!.explanation = "This clause is clearly unenforceable.";
    const out = applyPolicyFilter(r);
    expect(out.result.highlights).toHaveLength(0);
  });

  it("drops numeric risk scores wherever they appear", () => {
    const r = baseResult();
    r.concerns[0]!.interpretation = "Risk score: 83/100 — treat seriously.";
    const out = applyPolicyFilter(r);
    expect(out.result.concerns).toHaveLength(0);
    expect(out.removedItems).toBe(1);
  });

  it("drops outcome guarantees and privacy claims", () => {
    const r = baseResult();
    r.questions_to_ask[0]!.rationale = "You will win if you follow this.";
    r.overview.compensation = "Your data stays 100% private here.";
    const out = applyPolicyFilter(r);
    expect(out.result.questions_to_ask).toHaveLength(0);
    expect(/100% private/.test(out.result.overview.compensation ?? "")).toBe(
      false
    );
  });
});
