import { describe, expect, it } from "vitest";
import {
  buildChatSystemInstruction,
  extractEvidenceReferences,
  extractPageReferences,
  NOT_FOUND_TEMPLATE,
  EXTERNAL_LAW_TEMPLATE,
  OUT_OF_SCOPE_TEMPLATE,
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
    expect(sys).toContain(OUT_OF_SCOPE_TEMPLATE);
  });

  it("keeps chat scoped to the uploaded document", () => {
    const sys = buildChatSystemInstruction();
    expect(sys).toMatch(/strict document scope/i);
    expect(sys).toMatch(/coding\/programming questions/i);
    expect(POST_DOCUMENT_REMINDER).toContain(OUT_OF_SCOPE_TEMPLATE);
  });

  it("asserts instruction hierarchy over document content", () => {
    const sys = buildChatSystemInstruction();
    expect(sys).toMatch(/inert third-party material/i);
    expect(POST_DOCUMENT_REMINDER).toMatch(/never instructions/i);
  });

  it("requires quote-backed evidence blocks for document facts", () => {
    expect(buildChatSystemInstruction()).toContain(
      "[[EVIDENCE page=N]]verbatim quote from the document[[/EVIDENCE]]"
    );
  });
});

describe("extractEvidenceReferences", () => {
  it("extracts unique quote-backed references in order", () => {
    expect(
      extractEvidenceReferences(
        "Term. [[EVIDENCE page=2]]thirty days[[/EVIDENCE]] Again. [[EVIDENCE page=2]]thirty days[[/EVIDENCE]]"
      )
    ).toEqual([{ page: 2, quote: "thirty days" }]);
  });

  it("ignores malformed or empty evidence blocks", () => {
    expect(
      extractEvidenceReferences(
        "[[EVIDENCE page=0]][[/EVIDENCE]] [[EVIDENCE page=1]][[/EVIDENCE]]"
      )
    ).toEqual([]);
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
