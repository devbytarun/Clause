import { describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  errorMessage,
  isErrorCode,
} from "@/lib/error-codes";

describe("ERROR_CODES", () => {
  it("maps every code to a non-empty message", () => {
    for (const [code, entry] of Object.entries(ERROR_CODES)) {
      expect(entry.message.length, `message for ${code}`).toBeGreaterThan(10);
      expect(typeof entry.retryable, `retryable for ${code}`).toBe("boolean");
    }
  });

  it("never leaks internal detail in user-facing copy", () => {
    const banned = [/stack/i, /sql/i, /postgres/i, /api key/i, /exception/i];
    for (const [, entry] of Object.entries(ERROR_CODES)) {
      for (const pattern of banned) {
        expect(
          pattern.test(entry.message),
          `"${entry.message}" must not match ${pattern}`
        ).toBe(false);
      }
    }
  });

  it("recognizes known codes and rejects unknown ones", () => {
    expect(isErrorCode("pdf_encrypted")).toBe(true);
    expect(isErrorCode("totally_unknown")).toBe(false);
    expect(errorMessage("pdf_encrypted")).toBeTruthy();
    expect(errorMessage("totally_unknown")).toBeNull();
  });
});
