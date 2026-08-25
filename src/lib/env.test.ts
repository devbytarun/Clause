import { describe, expect, it } from "vitest";
import { EnvValidationError, parseEnv } from "@/lib/env";

const validBase = {
  DATABASE_URL:
    "postgresql://user:password@localhost:5432/clause?sslmode=require",
  AUTH_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("accepts the minimal required set and applies defaults", () => {
    const env = parseEnv({ ...validBase });
    expect(env.GEMINI_ANALYSIS_MODEL).toBe("gemini-2.5-flash");
    expect(env.GEMINI_CHAT_MODEL).toBe("gemini-2.5-flash");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.SIGNED_URL_TTL_SECONDS).toBe(900);
    expect(env.STORAGE_BUCKET).toBe("docs-prod");
    expect(env.RATE_LIMIT_UPLOADS_PER_HOUR).toBe(10);
    expect(env.RATE_LIMIT_CHAT_PER_MINUTE).toBe(12);
  });

  it("rejects a missing DATABASE_URL", () => {
    const withoutDbUrl = { ...validBase, DATABASE_URL: undefined };
    expect(() => parseEnv(withoutDbUrl)).toThrow(EnvValidationError);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() =>
      parseEnv({ ...validBase, DATABASE_URL: "mysql://nope" })
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects an AUTH_SECRET shorter than 32 chars", () => {
    expect(() =>
      parseEnv({ ...validBase, AUTH_SECRET: "too-short" })
    ).toThrow(EnvValidationError);
  });

  it("rejects malformed APP_URL", () => {
    expect(() => parseEnv({ ...validBase, APP_URL: "not a url" })).toThrow(
      /APP_URL/
    );
  });

  it("coerces numeric limits from strings", () => {
    const env = parseEnv({
      ...validBase,
      SIGNED_URL_TTL_SECONDS: "1800",
      RATE_LIMIT_CHAT_PER_MINUTE: "5",
    });
    expect(env.SIGNED_URL_TTL_SECONDS).toBe(1800);
    expect(env.RATE_LIMIT_CHAT_PER_MINUTE).toBe(5);
  });

  it("rejects non-positive numeric limits", () => {
    expect(() =>
      parseEnv({ ...validBase, RATE_LIMIT_CHAT_PER_MINUTE: "0" })
    ).toThrow();
  });

  it("reports all failing fields at once", () => {
    try {
      parseEnv({});
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      const fieldErrors = (err as EnvValidationError).fieldErrors;
      expect(Object.keys(fieldErrors)).toEqual(
        expect.arrayContaining(["DATABASE_URL", "AUTH_SECRET"])
      );
    }
  });
});
