import { GoogleGenAI } from "@google/genai";
import type { GenerateContentConfig } from "@google/genai";
import type { z } from "zod";
import { AnalysisResultSchema, type AnalysisResult } from "@/lib/schemas/analysis";
import {
  analysisJsonSchema,
  buildAnalysisSystemInstruction,
  buildAnalysisUserPrompt,
  buildRepairPrompt,
} from "@/lib/prompts/analysis";
import { requireGeminiApiKey } from "@/lib/env";

/**
 * GeminiGateway — the single module that owns @google/genai, model IDs,
 * generation params, retries, and usage accounting (blueprint §4/§6).
 *
 * Transport is injectable so tests can run against recorded responses;
 * production uses the real SDK. Model IDs come exclusively from env.
 */

export type GatewayErrorCode =
  | "rate_limited"
  | "provider_error"
  | "blocked"
  | "analysis_invalid";

export class GatewayError extends Error {
  constructor(
    public readonly code: GatewayErrorCode,
    message: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export interface GenerationInput {
  systemInstruction: string;
  userPrompt: string;
  jsonSchema: unknown;
  thinkingBudget?: number;
  maxOutputTokens?: number;
}

export interface RawGeneration {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface GeminiTransport {
  generate(input: GenerationInput): Promise<RawGeneration>;
}

const TRANSIENT_STATUSES = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 3;

function extractHttpStatus(err: unknown): number | null {
  if (typeof err === "object" && err !== null) {
    const anyErr = err as { status?: unknown; code?: unknown };
    if (typeof anyErr.status === "number") return anyErr.status;
    if (typeof anyErr.code === "number") return anyErr.code;
    const msg = err instanceof Error ? err.message : String(err);
    const m = msg.match(/\b(4\d\d|5\d\d)\b/);
    if (m) return Number(m[1]);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isConfigError(err: unknown): boolean {
  return (
    err instanceof Error &&
    /is required for (?:AI|storage) features but is not configured/.test(
      err.message
    )
  );
}

function normalizeFailure(lastError: unknown): never {
  if (lastError instanceof GatewayError) throw lastError;
  // Configuration problems are terminal and must reach callers unmapped.
  if (isConfigError(lastError)) {
    throw lastError;
  }
  const status = extractHttpStatus(lastError);
  if (status === 429) {
    throw new GatewayError(
      "rate_limited",
      "Provider quota exhausted after retries",
      true
    );
  }
  throw new GatewayError(
    "provider_error",
    lastError instanceof Error ? lastError.message : String(lastError),
    true
  );
}

/**
 * Transient-failure retry with exponential backoff (blueprint §6/§19):
 * 429/500/503 retried up to MAX_ATTEMPTS; everything else fails fast.
 */
async function generateWithRetries(
  transport: GeminiTransport,
  input: GenerationInput
): Promise<RawGeneration> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await transport.generate(input);
    } catch (err) {
      if (err instanceof GatewayError && !err.retryable) throw err;
      const status = extractHttpStatus(err);
      if (
        TRANSIENT_STATUSES.has(status ?? -1) &&
        attempt < MAX_ATTEMPTS - 1
      ) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      normalizeFailure(err);
    }
  }
  normalizeFailure(new Error("unreachable"));
}

/** Real SDK transport — server-side only; key never leaves the server. */
export function createSdkTransport(): GeminiTransport {
  return {
    async generate(input: GenerationInput): Promise<RawGeneration> {
      const ai = new GoogleGenAI({ apiKey: requireGeminiApiKey() });

      const config = {
        systemInstruction: input.systemInstruction,
        temperature: 0.2,
        maxOutputTokens: input.maxOutputTokens ?? 8192,
        responseMimeType: "application/json",
        responseJsonSchema: input.jsonSchema,
        ...(input.thinkingBudget !== undefined
          ? { thinkingConfig: { thinkingBudget: input.thinkingBudget } }
          : {}),
      } as GenerateContentConfig;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: input.userPrompt }] }],
        config,
      });

      const text = response.text ?? "";
      if (!text.trim()) {
        const finish =
          response.candidates?.[0]?.finishReason?.toString() ??
          "EMPTY_RESPONSE";
        const blocked =
          /SAFETY|BLOCK|PROHIBITED|RECITATION/i.test(finish) ||
          Boolean(response.promptFeedback?.blockReason);
        throw blocked
          ? new GatewayError("blocked", "Generation was blocked", false)
          : new GatewayError(
              "provider_error",
              `Empty response (${finish})`,
              true
            );
      }

      return {
        text,
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      };
    },
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Tolerate models wrapping JSON in fences despite instructions.
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new SyntaxError("No JSON object found in model output");
  }
}

function zodIssuesToMessages(error: z.ZodError<unknown>): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
  );
}

export interface AnalysisUsage extends RawGeneration {
  modelId: string;
}

export interface AnalyzeOutcome {
  result: AnalysisResult;
  usage: AnalysisUsage;
  repairUsed: boolean;
}

export interface GeminiGateway {
  analyzeDocument(documentBlock: string): Promise<AnalyzeOutcome>;
  readonly analysisModelId: () => string;
}

export function createGeminiGateway(
  transport: GeminiTransport = createSdkTransport()
): GeminiGateway {
  return {
    analysisModelId: () =>
      process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-flash",

    async analyzeDocument(documentBlock: string): Promise<AnalyzeOutcome> {
      const modelId =
        process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-flash";
      const systemInstruction = buildAnalysisSystemInstruction();
      const userPrompt = buildAnalysisUserPrompt(documentBlock);
      const budgetRaw = process.env.GEMINI_ANALYSIS_THINKING_BUDGET;
      const thinkingBudget =
        budgetRaw !== undefined && budgetRaw !== ""
          ? Number(budgetRaw)
          : 2048;

      let repairUsed = false;
      let totalIn = 0;
      let totalOut = 0;
      let promptForAttempt = userPrompt;

      // Blueprint §9 step 11: validate → one repair retry with errors appended.
      for (let attempt = 0; attempt < 2; attempt++) {
        const gen = await generateWithRetries(transport, {
          systemInstruction,
          userPrompt: promptForAttempt,
          jsonSchema: analysisJsonSchema,
          thinkingBudget,
        });
        totalIn += gen.inputTokens;
        totalOut += gen.outputTokens;

        let parsedJson: unknown;
        try {
          parsedJson = extractJson(gen.text);
        } catch {
          if (attempt === 0) {
            repairUsed = true;
            promptForAttempt = buildRepairPrompt(gen.text, [
              "Output is not parseable JSON",
            ]);
            continue;
          }
          throw new GatewayError("analysis_invalid", "Unparseable output", false);
        }

        const parsed = AnalysisResultSchema.safeParse(parsedJson);
        if (parsed.success) {
          return {
            result: parsed.data,
            usage: {
              text: gen.text,
              inputTokens: totalIn,
              outputTokens: totalOut,
              modelId,
            },
            repairUsed,
          };
        }

        if (attempt === 0) {
          repairUsed = true;
          promptForAttempt = buildRepairPrompt(
            gen.text,
            zodIssuesToMessages(parsed.error).slice(0, 20)
          );
          continue;
        }
        throw new GatewayError(
          "analysis_invalid",
          "Output failed schema validation after repair retry",
          false
        );
      }

      throw new GatewayError("analysis_invalid", "Unreachable", false);
    },
  };
}
