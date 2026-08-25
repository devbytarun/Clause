/**
 * Page-marker assembly for Gemini input (blueprint §8/§12).
 *
 * Documents are presented to the model as explicitly marked pages.
 * Extracted text is sanitized first: sequences resembling our own
 * markers or document fences are neutralized so a hostile document
 * cannot forge pagination or close the fence early.
 */

export const PAGE_MARKER_PREFIX = "=== PAGE ";
export const PAGE_MARKER_SUFFIX = " ===";
export const DOCUMENT_OPEN = "<document>";
export const DOCUMENT_CLOSE = "</document>";

const FORGED_PATTERNS: RegExp[] = [
  /\[\s*PAGE\s+\d+\s*\]/gi,
  /={2,}\s*PAGE\s+\d+\s*={2,}/gi,
  /<\s*\/?\s*document[^>]*>/gi,
];

export interface SanitizedPage {
  pageNumber: number;
  /** Sanitized page text — safe to embed between fences. */
  safeText: string;
}

export function sanitizePageText(text: string): string {
  let out = text;
  for (const regex of FORGED_PATTERNS) {
    out = out.replace(regex, "[marker removed]");
  }
  return out;
}

export function sanitizePages(pages: { pageNumber: number; text: string }[]): SanitizedPage[] {
  return pages.map((p) => ({
    pageNumber: p.pageNumber,
    safeText: sanitizePageText(p.text),
  }));
}

export function buildDocumentBlock(pages: SanitizedPage[]): string {
  const body = pages
    .map(
      (p) =>
        `${PAGE_MARKER_PREFIX}${p.pageNumber}${PAGE_MARKER_SUFFIX}\n${p.safeText}`
    )
    .join("\n\n");
  return `${DOCUMENT_OPEN}\n${body}\n${DOCUMENT_CLOSE}`;
}

export function buildPageMarkedText(pages: {
  pageNumber: number;
  text: string;
}[]): string {
  return buildDocumentBlock(sanitizePages(pages));
}
