/**
 * Stable machine error codes mapped to user-facing copy (blueprint §19).
 * Codes are persisted in DB / returned via API; messages are display-only.
 * Never expose stack traces or internal detail through this map.
 */
export const ERROR_CODES = {
  unauthorized: {
    message: "You need to sign in to do that.",
    retryable: false,
  },
  not_found: {
    message: "This item does not exist or was deleted.",
    retryable: false,
  },
  bad_request: { message: "The request could not be processed.", retryable: false },

  file_too_large: {
    message: "That file is larger than 20 MB. Please upload a smaller PDF.",
    retryable: false,
  },
  file_bad_type: {
    message: "Only PDF files are supported.",
    retryable: false,
  },
  file_empty: { message: "That file appears to be empty.", retryable: false },
  pdf_encrypted: {
    message:
      "This PDF is password-protected. Remove the protection and upload again.",
    retryable: false,
  },
  pdf_corrupt: {
    message: "This PDF could not be read and may be corrupted.",
    retryable: false,
  },
  too_many_pages: {
    message: "This document exceeds the 120-page limit.",
    retryable: false,
  },

  extraction_failed: {
    message: "Text extraction failed for this document.",
    retryable: true,
  },
  analysis_invalid: {
    message:
      "The analysis did not produce a valid result. You can retry the analysis.",
    retryable: true,
  },
  rate_limited: {
    message: "Too many requests. Please wait a moment and try again.",
    retryable: true,
  },
  provider_error: {
    message: "The AI service is temporarily unavailable. Try again shortly.",
    retryable: true,
  },
  ai_capacity: {
    message:
      "The AI service has reached today's usage capacity. Please try again tomorrow.",
    retryable: true,
  },
  blocked: {
    message:
      "The AI service declined to process this document. Analysis cannot continue.",
    retryable: false,
  },
  storage_unavailable: {
    message: "Document storage is temporarily unavailable.",
    retryable: true,
  },
  chat_unavailable: {
    message: "Chat is temporarily unavailable. Your history is intact.",
    retryable: true,
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function isErrorCode(value: string): value is ErrorCode {
  return value in ERROR_CODES;
}

export function errorMessage(code: string): string | null {
  return isErrorCode(code) ? ERROR_CODES[code].message : null;
}
