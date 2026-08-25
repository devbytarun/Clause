import { describe, expect, it } from "vitest";
import {
  hasPdfMagicBytes,
  processDocument,
  validateBuffer,
  DocumentProcessorError,
} from "@/lib/pipeline/document-processor";
import { buildTextPdf } from "@/test-support/pdf-writer";

describe("validateBuffer", () => {
  it("rejects empty buffers", () => {
    expect(() => validateBuffer(new Uint8Array())).toThrowError(
      DocumentProcessorError
    );
  });

  it("rejects oversized buffers before parsing", () => {
    const big = new Uint8Array(20_971_521);
    big[0] = 0x25; // %
    expect(() => validateBuffer(big)).toThrowError(/file_too_large/);
  });

  it("rejects files without the %PDF- magic header", () => {
    const fake = new TextEncoder().encode("MZ fake executable");
    expect(() => validateBuffer(fake)).toThrowError(/file_bad_type/);
  });

  it("hasPdfMagicBytes accepts real headers only", () => {
    expect(hasPdfMagicBytes(new TextEncoder().encode("%PDF-1.7 tail"))).toBe(true);
    expect(hasPdfMagicBytes(new TextEncoder().encode("%PDX"))).toBe(false);
    expect(hasPdfMagicBytes(new Uint8Array([0x25]))).toBe(false);
  });
});

describe("processDocument with generated fixtures", () => {
  it("extracts per-page text deterministically", async () => {
    const pdf = buildTextPdf([
      [
        "The Receiving Party shall protect Confidential Information with",
        "the same degree of care it uses for its own similar information.",
        "This obligation continues for three years after the disclosure date.",
        "Nothing in this agreement grants any licence to the receiving party.",
      ],
      [
        "Either party may terminate this engagement with sixty days written",
        "notice delivered to the other party in accordance with clause four.",
      ],
    ]);
    const out = await processDocument(pdf);
    expect(out.pageCount).toBe(2);
    expect(out.isScanned).toBe(false);
    expect(out.pages[0]!.text).toContain("Receiving Party shall protect");
    expect(out.pages[1]!.text).toContain("sixty days written");
    expect(out.charCount).toBeGreaterThan(200);
  });

  it("flags text-poor PDFs as scanned", async () => {
    const pdf = buildTextPdf([["x"]]);
    const out = await processDocument(pdf);
    expect(out.charCount).toBeLessThan(200);
    expect(out.isScanned).toBe(true);
  });

  it("maps garbage bytes to pdf_corrupt", async () => {
    const garbage = new Uint8Array(2048);
    crypto.getRandomValues(garbage);
    garbage[0] = 0x25;
    garbage.set(new TextEncoder().encode("%PDF-"), 0);
    await expect(processDocument(garbage)).rejects.toThrowError(/pdf_corrupt/);
  });

  it("rejects a truncated-but-magic file as corrupt", async () => {
    const full = buildTextPdf([["hello world content here"]]);
    const truncated = full.slice(0, Math.floor(full.length * 0.4));
    await expect(processDocument(truncated)).rejects.toThrowError();
  });
});
