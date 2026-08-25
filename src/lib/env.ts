import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).startsWith("postgres", {
    message: "DATABASE_URL must be a Postgres connection string",
  }),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.url().default("http://localhost:3000"),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),

  GEMINI_ANALYSIS_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_CHAT_MODEL: z.string().min(1).default("gemini-2.5-flash"),

  SUPABASE_STORAGE_URL: z.url().optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  STORAGE_BUCKET: z.string().min(1).default("docs-prod"),

  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  RATE_LIMIT_UPLOADS_PER_HOUR: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_CHAT_PER_MINUTE: z.coerce.number().int().positive().default(12),
  RATE_LIMIT_FILE_URLS_PER_HOUR: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_RETRY_PER_HOUR: z.coerce.number().int().positive().default(3),

  SENTRY_DSN: z.url().optional(),
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
  const key = getEnv().GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is required for AI features but is not configured"
    );
  }
  return key;
}

export function requireStorageConfig(): {
  url: string;
  serviceKey: string;
  bucket: string;
} {
  const { SUPABASE_STORAGE_URL: url, SUPABASE_SERVICE_KEY: serviceKey } =
    getEnv();
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_STORAGE_URL and SUPABASE_SERVICE_KEY are required for storage features but are not configured"
    );
  }
  return { url, serviceKey, bucket: getEnv().STORAGE_BUCKET };
}
