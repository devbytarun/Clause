import { describe, expect, it } from "vitest";
import {
  AnalysisResultSchema,
  ConcernSchema,
  SourceSchema,
} from "@/lib/schemas/analysis";

describe("SourceSchema", () => {
  it("accepts a valid source with optional section", () => {
    expect(() =>
      SourceSchema.parse({ page: 3, section: "Termination", quote: "sixty days" })
    ).not.toThrow();
  });

  it("rejects page numbers below 1", () => {
    expect(SourceSchema.safeParse({ page: 0, quote: "x" }).success).toBe(false);
  });

  it("requires a non-empty quote", () => {
    expect(SourceSchema.safeParse({ page: 1, quote: "" }).success).toBe(false);
    expect(SourceSchema.safeParse({ page: 1 }).success).toBe(false);
  });
});

describe("AnalysisResultSchema", () => {
  it("parses a minimal complete result", () => {
    const raw = {
      overview: { document_type: "nda" },
      highlights: [],
      positive_points: [],
      concerns: [],
      questions_to_ask: [],
    };
    const parsed = AnalysisResultSchema.parse(raw);
    expect(parsed.overview.parties).toEqual([]);
    expect(parsed.overview.compensation).toBeUndefined();
  });

  it("defaults omitted arrays to empty rather than failing", () => {
    const parsed = AnalysisResultSchema.parse({
      overview: {},
    });
    expect(parsed.highlights).toEqual([]);
    expect(parsed.positive_points).toEqual([]);
    expect(parsed.concerns).toEqual([]);
    expect(parsed.questions_to_ask).toEqual([]);
  });

  it("rejects unknown priority values (no invented severity scale)", () => {
    const bad = {
      title: "t",
      priority: "critical",
      document_fact: "f",
      interpretation: "i",
      uncertainty: "u",
      plain_english: "p",
      source: { page: 1, quote: "q" },
    };
    expect(ConcernSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts all three priority levels", () => {
    for (const priority of ["low", "moderate", "high"] as const) {
      expect(
        ConcernSchema.safeParse({
          title: "t",
          priority,
          document_fact: "f",
          interpretation: "i",
          uncertainty: "u",
          plain_english: "p",
          source: { page: 1, quote: "q" },
        }).success
      ).toBe(true);
    }
  });

  it("keeps absence representable — null and undefined pass for nullable fields", () => {
    expect(
      AnalysisResultSchema.safeParse({
        overview: { compensation: null },
        highlights: [
          {
            title: "T",
            explanation: "E",
            source: { page: 2, quote: "quote text" },
          },
        ],
      }).success
    ).toBe(true);
  });

  it("rejects malformed sources inside concerns", () => {
    const bad = {
      title: "t",
      priority: "low",
      document_fact: "f",
      interpretation: "i",
      uncertainty: "u",
      plain_english: "p",
      source: { page: -5, quote: "q" },
    };
    expect(ConcernSchema.safeParse(bad).success).toBe(false);
  });
});
