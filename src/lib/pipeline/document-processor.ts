import { extractText, getDocumentProxy } from "unpdf";

export const MAX_SIZE_BYTES = 20_971_520; // 20 MB
export const MAX_PAGES = 120;
/** Total extracted characters below this ⇒ treated as scanned (blueprint §8). */
const SCANNED_CHAR_THRESHOLD = 200;

export type ProcessorErrorCode =
  | "file_empty"
  | "file_too_large"
  | "file_bad_type"
  | "pdf_encrypted"
  | "pdf_corrupt"
  | "too_many_pages";

export class DocumentProcessorError extends Error {
  constructor(public readonly code: ProcessorErrorCode) {
    super(`Document processing failed: ${code}`);
    this.name = "DocumentProcessorError";
  }
}

export interface ProcessedDocument {
  pages: { pageNumber: number; text: string }[];
  pageCount: number;
  charCount: number;
  isScanned: boolean;
}

/** Magic-byte check: real PDFs start with %PDF-. */
export function hasPdfMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 5) return false;
  const header = String.fromCharCode(...buffer.slice(0, 5));
  return header === "%PDF-";
}

/**
 * Structural validation before any parsing (blueprint §8 steps 2–3).
 * Extension/MIME checks happen at the API boundary; here we enforce
 * the byte-level invariants that cannot lie.
 */
export function validateBuffer(buffer: Uint8Array): void {
  if (buffer.length === 0) {
    throw new DocumentProcessorError("file_empty");
  }
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new DocumentProcessorError("file_too_large");
  }
  if (!hasPdfMagicBytes(buffer)) {
    throw new DocumentProcessorError("file_bad_type");
  }
}

function mapParseError(err: unknown): never {
  const name =
    err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  if (
    name === "PasswordException" ||
    /password/i.test(message)
  ) {
    throw new DocumentProcessorError("pdf_encrypted");
  }
  throw new DocumentProcessorError("pdf_corrupt");
}

/**
 * Parses the PDF and extracts per-page text deterministically.
 * Page boundaries come from the PDF structure, never from the model.
 */
export async function processDocument(
  buffer: Uint8Array
): Promise<ProcessedDocument> {
  validateBuffer(buffer);

  let pdf: unknown;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch (err) {
    mapParseError(err);
  }

  let perPageText: string[];
  try {
    const result = await extractText(pdf as Parameters<typeof extractText>[0], {
      mergePages: false,
    });
    perPageText = result.text;
  } catch (err) {
    mapParseError(err);
  }

  const pageCount = perPageText.length;
  if (pageCount === 0) {
    throw new DocumentProcessorError("pdf_corrupt");
  }
  if (pageCount > MAX_PAGES) {
    throw new DocumentProcessorError("too_many_pages");
  }

  const pages = perPageText.map((text, idx) => ({
    pageNumber: idx + 1,
    text,
  }));

  const charCount = pages.reduce((sum, p) => sum + p.text.length, 0);

  return {
    pages,
    pageCount,
    charCount,
    isScanned: charCount < SCANNED_CHAR_THRESHOLD,
  };
}
