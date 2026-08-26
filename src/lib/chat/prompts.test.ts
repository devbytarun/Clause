import { describe, expect, it } from "vitest";
import {
  buildChatSystemInstruction,
  extractPageReferences,
  NOT_FOUND_TEMPLATE,
  EXTERNAL_LAW_TEMPLATE,
  POST_DOCUMENT_REMINDER,
} from "@/lib/chat/prompts";

describe("refusal templates", () => {
  it("are stable strings the eval suite can assert verbatim", () => {
    expect(NOT_FOUND_TEMPLATE).toBe(
      "I couldn't find information about this in the uploaded document."
    );
    expect(EXTERNAL_LAW_TEMPLATE).toBe(
      "The document doesn't provide enough information to answer this. This may depend on applicable law and your circumstances."
    );
  });

  it("system instruction embeds both templates verbatim", () => {
    const sys = buildChatSystemInstruction();
    expect(sys).toContain(NOT_FOUND_TEMPLATE);
    expect(sys).toContain(EXTERNAL_LAW_TEMPLATE);
  });

  it("asserts instruction hierarchy over document content", () => {
    const sys = buildChatSystemInstruction();
    expect(sys).toMatch(/inert third-party material/i);
    expect(POST_DOCUMENT_REMINDER).toMatch(/never instructions/i);
  });
});

describe("extractPageReferences", () => {
  const validPages = new Set([1, 2, 7]);

  it("collects unique page refs in first-appearance order", () => {
    const answer =
      "The term is sixty days (Page 7). Later it repeats (Page 7) and adds notice rules (Page 2).";
    expect(extractPageReferences(answer, validPages)).toEqual([
      { page: 7, quote: "", verification: "verified" },
      { page: 2, quote: "", verification: "verified" },
    ]);
  });

  it("drops references to pages that do not exist (fabrication guard)", () => {
    const answer = "Totally invented (Page 99) plus real (Page 1).";
    expect(extractPageReferences(answer, validPages)).toEqual([
      { page: 1, quote: "", verification: "verified" },
    ]);
  });

  it("returns nothing when the answer cites no pages", () => {
    expect(extractPageReferences(NOT_FOUND_TEMPLATE, validPages)).toEqual([]);
  });
});
