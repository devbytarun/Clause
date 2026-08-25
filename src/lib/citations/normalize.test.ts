import { describe, expect, it } from "vitest";
import { normalizeText, similarityRatio } from "@/lib/citations/normalize";

describe("normalizeText", () => {
  it("folds curly quotes and dashes to straight forms", () => {
    const input = "\u201CHello\u201D \u2014 world \u2019s test";
    expect(normalizeText(input)).toBe('"hello" - world \'s test');
  });

  it("collapses whitespace of any kind", () => {
    expect(normalizeText("a\n\t b   c\u00A0d")).toBe("a b c d");
  });

  it("expands ligatures and drops soft hyphens", () => {
    expect(normalizeText("pro\uFB01t sig\u00ADning")).toBe("profit signing");
  });

  it("normalizes unicode via NFC", () => {
    const decomposed = "cafe\u0301"; // e + combining acute
    expect(normalizeText(decomposed)).toBe(normalizeText("caf\u00E9"));
  });

  it("case-folds for matching", () => {
    expect(normalizeText("Confidential Information")).toBe(
      normalizeText("confidential information")
    );
  });
});

describe("similarityRatio", () => {
  it("is 1 for identical strings", () => {
    expect(similarityRatio("abc", "abc")).toBe(1);
  });

  it("is 0 when one side is empty", () => {
    expect(similarityRatio("", "abc")).toBe(0);
    expect(similarityRatio("abc", "")).toBe(0);
  });

  it("decreases with edit distance", () => {
    const close = similarityRatio("employment agreement", "employment agrément");
    const far = similarityRatio("employment agreement", "banana republic");
    expect(close).toBeGreaterThan(far);
  });
});
