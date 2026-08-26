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
 * generation params, retries, streaming, and usage accounting
 * (blueprint §4/§6/§11). Transport is injectable so tests run against
 * recorded/scripted responses; production uses the real SDK.
 *
 * Model IDs come exclusively from env; server-side only — the API key
 * never reaches the browser.
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
  jsonSchema?: unknown;
  thinkingBudget?: number;
  maxOutputTokens?: number;
}

export interface RawGeneration {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ChatStream {
  /** Yields incremental text deltas in order. */
  deltas: AsyncIterable<string>;
  /** Valid after the last delta has been consumed. */
  usage: () => { inputTokens: number; outputTokens: number };
}

export interface GeminiTransport {
  generate(input: GenerationInput): Promise<RawGeneration>;
  /**
   * Streams a chat completion. Implementations must throw before the
   * first delta for connection-level failures (retryable upstream) and
   * surface usage once iteration completes.
   */
  streamChat(input: GenerationInput): Promise<ChatStream>;
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
    /is required for (?:AI|storage|auth) features but is not configured/.test(
      err.message
    )
  );
}

function normalizeFailure(lastError: unknown): never {
  if (lastError instanceof GatewayError) throw lastError;
  // Configuration problems are terminal and must reach callers unmapped.
  if (isConfigError(lastError)) throw lastError;
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

/** Transient-failure retry with exponential backoff (blueprint §6/§19). */
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
      if (TRANSIENT_STATUSES.has(status ?? -1) && attempt < MAX_ATTEMPTS - 1) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      normalizeFailure(err);
    }
  }
  normalizeFailure(new Error("unreachable"));
}

function buildSdkConfig(input: GenerationInput): GenerateContentConfig {
  return {
    systemInstruction: input.systemInstruction,
    temperature: 0.2,
    maxOutputTokens: input.maxOutputTokens ?? 8192,
    ...(input.jsonSchema !== undefined
      ? {
          responseMimeType: "application/json",
          responseJsonSchema: input.jsonSchema,
        }
      : {}),
    ...(input.thinkingBudget !== undefined
      ? { thinkingConfig: { thinkingBudget: input.thinkingBudget } }
      : {}),
  } as GenerateContentConfig;
}

function contentsFor(userPrompt: string) {
  return [{ role: "user", parts: [{ text: userPrompt }] }];
}

/** Real SDK transport — server-side only. */
export function createSdkTransport(): GeminiTransport {
  const modelId = () =>
    process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-flash";

  return {
    async generate(input): Promise<RawGeneration> {
      const ai = new GoogleGenAI({ apiKey: requireGeminiApiKey() });
      const response = await ai.models.generateContent({
        model: modelId(),
        contents: contentsFor(input.userPrompt),
        config: buildSdkConfig(input),
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
          : new GatewayError("provider_error", `Empty response (${finish})`, true);
      }

      return {
        text,
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      };
    },

    async streamChat(input): Promise<ChatStream> {
      const ai = new GoogleGenAI({ apiKey: requireGeminiApiKey() });
      const response = await ai.models.generateContentStream({
        model:
          process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash",
        contents: contentsFor(input.userPrompt),
        config: buildSdkConfig(input),
      });

      let inputTokens = 0;
      let outputTokens = 0;

      async function* iterate(): AsyncGenerator<string> {
        for await (const chunk of response) {
          if (chunk.text) yield chunk.text;
          if (chunk.usageMetadata) {
            inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
            outputTokens =
              chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
          }
        }
      }

      return {
        deltas: iterate(),
        usage: () => ({ inputTokens, outputTokens }),
      };
    },
  };
}

/**
 * Streams a chat completion with retry-before-first-token semantics:
 * transient failures prior to any delta are retried; failures after
 * streaming began are surfaced immediately (blueprint §11).
 */
async function streamChatWithRetries(
  transport: GeminiTransport,
  input: GenerationInput,
  onDelta: (t: string) => void
): Promise<RawGeneration> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let emitted = false;
    try {
      const stream = await transport.streamChat(input);
      let text = "";
      for await (const delta of stream.deltas) {
        emitted = true;
        text += delta;
        onDelta(delta);
      }
      const usage = stream.usage();
      return { text, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
    } catch (err) {
      if (emitted) {
        // Partial answer already streamed to the user — no silent retry.
        normalizeFailure(err);
      }
      if (err instanceof GatewayError && !err.retryable) throw err;
      lastError = err;
      const status = extractHttpStatus(err);
      if (TRANSIENT_STATUSES.has(status ?? -1) && attempt < MAX_ATTEMPTS - 1) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      normalizeFailure(lastError);
    }
  }
  void lastError;
  normalizeFailure(new Error("unreachable"));
}

function zodIssuesToMessages(error: z.ZodError<unknown>): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
  );
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new SyntaxError("No JSON object found in model output");
  }
}

export interface AnalysisUsage extends RawGeneration {
  modelId: string;
}

export interface AnalyzeOutcome {
  result: AnalysisResult;
  usage: AnalysisUsage;
  repairUsed: boolean;
}

export interface ChatTurnInput {
  systemInstruction: string;
  userPrompt: string;
  thinkingBudget?: number;
  maxOutputTokens?: number;
}

export interface ChatOutcome extends RawGeneration {
  modelId: string;
}

export interface GeminiGateway {
  analyzeDocument(documentBlock: string): Promise<AnalyzeOutcome>;
  chatStream(
    input: ChatTurnInput,
    onDelta: (text: string) => void
  ): Promise<ChatOutcome>;
  analysisModelId(): string;
  chatModelId(): string;
}

export function createGeminiGateway(
  transport: GeminiTransport = createSdkTransport()
): GeminiGateway {
  return {
    analysisModelId: () =>
      process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-flash",

    chatModelId: () => process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash",

    chatStream(input, onDelta) {
      const budget =
        input.thinkingBudget ??
        Number(process.env.GEMINI_CHAT_THINKING_BUDGET ?? 0);

      return streamChatWithRetries(
        transport,
        {
          systemInstruction: input.systemInstruction,
          userPrompt: input.userPrompt,
          thinkingBudget: Number.isFinite(budget) ? budget : 0,
          maxOutputTokens: input.maxOutputTokens ?? 4096,
        },
        onDelta
      ).then((gen) => ({
        ...gen,
        modelId: process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash",
      }));
    },

    async analyzeDocument(documentBlock: string): Promise<AnalyzeOutcome> {
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
              modelId: process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-flash",
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
