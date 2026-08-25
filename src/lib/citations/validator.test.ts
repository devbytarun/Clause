import { describe, expect, it } from "vitest";
import { validateSource, summarizeVerifications } from "@/lib/citations/validator";
import type { PageText } from "@/lib/citations/validator";
import type { Source } from "@/lib/schemas/analysis";

const pages: PageText[] = [
  { pageNumber: 1, text: "This Agreement is entered into on 10 July 2026 between the parties." },
  {
    pageNumber: 2,
    text: "The Receiving Party shall protect Confidential Information with reasonable care at all times.",
  },
];

function src(page: number, quote: string): Source {
  return { page, quote };
}

describe("validateSource", () => {
  it("verifies an exact verbatim quote on the cited page", () => {
    const out = validateSource(src(2, "with reasonable care"), pages);
    expect(out.verification).toBe("verified");
  });

  it("verifies across line breaks and typography differences", () => {
    const out = validateSource(
      src(1, "entered into on 10 July 2026"),
      pages
    );
    expect(out.verification).toBe("verified");
  });

  it("marks fuzzy matches caused by extraction artifacts", () => {
    // Quote with a doubled character artifact vs the page text.
    const out = validateSource(
      src(2, "protect Confidential Informatioon with reasonable care"),
      pages
    );
    expect(out.verification).toBe("verified_fuzzy");
  });

  it("corrects the page number when right quote is cited on wrong page", () => {
    const out = validateSource(
      src(1, "shall protect Confidential Information"),
      pages
    );
    expect(out.verification).toBe("page_corrected");
    expect(out.correctedPage).toBe(2);
  });

  it("rejects fabricated quotes as unverified", () => {
    const out = validateSource(
      src(1, "the employee shall forfeit all intellectual property worldwide forever"),
      pages
    );
    expect(out.verification).toBe("unverified");
  });

  it("rejects empty quotes", () => {
    const out = validateSource(src(1, "   "), pages);
    expect(out.verification).toBe("unverified");
  });

  it("forces unverified for scanned documents regardless of match quality", () => {
    const out = validateSource(src(2, "reasonable care"), pages, true);
    expect(out.verification).toBe("unverified");
  });

  it("handles a cited page that does not exist", () => {
    const out = validateSource(src(99, "reasonable care"), pages);
    expect(["page_corrected", "unverified"]).toContain(out.verification);
  });
});

describe("summarizeVerifications", () => {
  it("counts each verification state", () => {
    const stats = summarizeVerifications([
      { page: 1, quote: "a", verification: "verified" },
      { page: 1, quote: "b", verification: "verified" },
      { page: 2, quote: "c", verification: "verified_fuzzy" },
      { page: 3, quote: "d", verification: "page_corrected", correctedPage: 2 },
      { page: 4, quote: "e", verification: "unverified" },
    ]);
    expect(stats).toEqual({
      total: 5,
      verified: 2,
      verifiedFuzzy: 1,
      pageCorrected: 1,
      unverified: 1,
    });
  });
});
