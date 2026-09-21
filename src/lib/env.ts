import { z } from "zod";

/**
 * Treats empty/whitespace-only strings as unset so template-style
 * .env files (VAR= placeholders) validate cleanly instead of failing
 * on optional fields.
 */
function emptied<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema
  );
}

const serverEnvSchema = z.object({
  // Truly required — empty values must fail loudly.
  DATABASE_URL: z.string().min(1).startsWith("postgres", {
    message: "DATABASE_URL must be a Postgres connection string",
  }),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters"),

  APP_URL: emptied(z.url().default("http://localhost:3000")),

  GOOGLE_GENERATIVE_AI_API_KEY: emptied(z.string().min(1).optional()),

  GEMINI_ANALYSIS_MODEL: emptied(
    z.string().min(1).default("gemini-3.6-flash")
  ),
  GEMINI_CHAT_MODEL: emptied(z.string().min(1).default("gemini-3.6-flash")),

  STORAGE_DRIVER: emptied(z.enum(["local", "supabase"]).default("local")),
  SUPABASE_STORAGE_URL: emptied(z.url().optional()),
  SUPABASE_SERVICE_KEY: emptied(z.string().min(1).optional()),
  STORAGE_BUCKET: emptied(z.string().min(1).default("docs-prod")),

  SIGNED_URL_TTL_SECONDS: emptied(
    z.coerce.number().int().positive().default(900)
  ),

  RATE_LIMIT_UPLOADS_PER_HOUR: emptied(
    z.coerce.number().int().positive().default(10)
  ),
  RATE_LIMIT_CHAT_PER_MINUTE: emptied(
    z.coerce.number().int().positive().default(12)
  ),
  RATE_LIMIT_FILE_URLS_PER_HOUR: emptied(
    z.coerce.number().int().positive().default(60)
  ),
  RATE_LIMIT_RETRY_PER_HOUR: emptied(
    z.coerce.number().int().positive().default(3)
  ),

  SENTRY_DSN: emptied(z.url().optional()),

  NEXT_PUBLIC_SUPABASE_URL: emptied(z.url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: emptied(z.string().min(1).optional()),

  CRON_SECRET: emptied(z.string().min(16).optional()),

  /**
   * App-level daily cap on Gemini calls (analysis + chat share it).
   * Conservative default keeps aggregate traffic inside typical
   * free-tier per-day limits; match to your AI Studio RPD value.
   */
  GEMINI_DAILY_REQUEST_LIMIT: emptied(
    z.coerce.number().int().positive().default(400)
  ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string[]>) {
    super(
      `Invalid environment variables: ${Object.keys(fieldErrors).join(", ")}`
    );
    this.name = "EnvValidationError";
  }
}

export function parseEnv(
  input: Record<string, string | undefined>
): ServerEnv {
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    throw new EnvValidationError(z.flattenError(result.error).fieldErrors);
  }
  return result.data;
}

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (!cached) {
    cached = parseEnv(process.env);
  }
  return cached;
}

export function requireGeminiApiKey(): string {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is required for AI features but is not configured"
    );
  }
  return key;
}

/**
 * Accepts either the project base (https://xyz.supabase.co) or the full
 * storage REST base (…/storage/v1) and always yields the project base,
 * which the storage adapter extends with /storage/v1 itself.
 */
export function requireStorageConfig(): {
  url: string;
  serviceKey: string;
  bucket: string;
} {
  const rawUrl = process.env.SUPABASE_STORAGE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim();
  const bucket = getEnv().STORAGE_BUCKET;
  if (!rawUrl || !serviceKey) {
    throw new Error(
      "SUPABASE_STORAGE_URL and SUPABASE_SERVICE_KEY are required for storage features but are not configured"
    );
  }
  const url = rawUrl.replace(/\/storage\/v1\/?$/i, "").replace(/\/+$/, "");
  return { url, serviceKey, bucket };
}
