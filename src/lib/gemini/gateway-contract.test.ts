import { describe, expect, it, vi } from "vitest";
import {
  createGeminiGateway,
  GatewayError,
  type GeminiTransport,
  type RawGeneration,
} from "@/lib/gemini/gateway";
import { buildPageMarkedText } from "@/lib/pipeline/page-markers";

function gen(text: string, inputTokens = 100, outputTokens = 50): RawGeneration {
  return { text, inputTokens, outputTokens };
}

const validAnalysisJson = JSON.stringify({
  overview: {
    document_type: "nda",
    parties: [{ role: "Disclosing Party", name: "Northwind Analytics LLP" }],
    dates: [{ label: "signing", value: "10 July 2026" }],
    compensation: null,
    benefits: [],
  },
  highlights: [
    {
      title: "Confidentiality definition",
      explanation: "Information is protected whether marked or not.",
      source: { page: 1, quote: "whether marked confidential or not" },
    },
  ],
  positive_points: [],
  concerns: [
    {
      title: "Survival period",
      priority: "moderate",
      document_fact: "Obligations survive for three years.",
      interpretation: "Sharing details later may still be restricted.",
      uncertainty: "Exact enforceability depends on applicable law.",
      plain_english: "This NDA keeps restricting you for three years.",
      source: { page: 2, quote: "survive for three years" },
    },
  ],
  questions_to_ask: [],
});

function emptyStream() {
  const iterator: AsyncIterableIterator<string> = {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    async next() {
      return { value: undefined, done: true as const };
    },
  };
  return { deltas: iterator, usage: () => ({ inputTokens: 0, outputTokens: 0 }) };
}

function makeTransportScript(
  responses: Array<() => Promise<RawGeneration>>
): GeminiTransport & { calls: number } {
  let i = 0;
  return {
    get calls() {
      return i;
    },
    async generate() {
      const step = responses[i];
      i++;
      if (!step) throw new Error("script exhausted");
      return step();
    },
    async streamChat() {
      return emptyStream();
    },
  };
}

const documentBlock = buildPageMarkedText([
  { pageNumber: 1, text: "whether marked confidential or not" },
  { pageNumber: 2, text: "survive for three years" },
]);

describe("GeminiGateway contract", () => {
  it("returns a validated analysis on the first attempt", async () => {
    const transport = makeTransportScript([
      () => Promise.resolve(gen(validAnalysisJson)),
    ]);
    const gateway = createGeminiGateway(transport);
    const out = await gateway.analyzeDocument(documentBlock);

    expect(transport.calls).toBe(1);
    expect(out.repairUsed).toBe(false);
    expect(out.result.overview.document_type).toBe("nda");
    expect(out.result.concerns[0]!.source.page).toBe(2);
    expect(out.usage.inputTokens).toBe(100);
    expect(out.usage.outputTokens).toBe(50);
    expect(out.usage.modelId).toBe("gemini-2.5-flash");
  });

  it("repairs once when output is unparseable JSON", async () => {
    const transport = makeTransportScript([
      () => Promise.resolve(gen("not json at all")),
      () => Promise.resolve(gen(validAnalysisJson)),
    ]);
    const gateway = createGeminiGateway(transport);
    const out = await gateway.analyzeDocument(documentBlock);

    expect(transport.calls).toBe(2);
    expect(out.repairUsed).toBe(true);
    expect(out.result.highlights).toHaveLength(1);
  });

  it("repairs once when output violates the schema, citing validator errors", async () => {
    const badSchema = JSON.stringify({
      overview: {},
      concerns: [
        {
          title: "x",
          priority: "catastrophic",
          source: { page: 0, quote: "" },
        },
      ],
    });
    const transport = makeTransportScript([
      () => Promise.resolve(gen(badSchema)),
      () => Promise.resolve(gen(validAnalysisJson)),
    ]);
    const gateway = createGeminiGateway(transport);
    const out = await gateway.analyzeDocument(documentBlock);
    expect(transport.calls).toBe(2);
    expect(out.repairUsed).toBe(true);
  });

  it("fails with analysis_invalid after repair still invalid", async () => {
    const bad = gen('{"overview": {}, "concerns": [{"priority": "nope"}]}');
    const transport = makeTransportScript([() => Promise.resolve(bad), () => Promise.resolve(bad)]);
    const gateway = createGeminiGateway(transport);
    await expect(gateway.analyzeDocument(documentBlock)).rejects.toMatchObject({
      code: "analysis_invalid",
    });
  });

  it("recovers from transient provider errors via backoff retries", async () => {
    const ok = vi.fn(async () => gen(validAnalysisJson));
    const transport = makeTransportScript([
      () => Promise.reject(new Error("500 Internal Server Error")),
      () =>
        Promise.reject(
          Object.assign(new Error("503 unavailable"), { status: 503 })
        ),
      ok,
    ]);
    const gateway = createGeminiGateway(transport);
    const out = await gateway.analyzeDocument(documentBlock);
    expect(transport.calls).toBe(3);
    expect(out.result.overview.document_type).toBe("nda");
  }, 15000);

  it("maps persistent quota exhaustion to rate_limited", async () => {
    const transport = makeTransportScript([
      () => Promise.reject(Object.assign(new Error("429"), { status: 429 })),
      () => Promise.reject(Object.assign(new Error("429"), { status: 429 })),
      () => Promise.reject(Object.assign(new Error("429"), { status: 429 })),
    ]);
    const gateway = createGeminiGateway(transport);
    await expect(gateway.analyzeDocument(documentBlock)).rejects.toMatchObject({
      code: "rate_limited",
    });
  }, 15000);

  it("propagates safety blocks without retrying", async () => {
    const transport = makeTransportScript([
      () => Promise.reject(new GatewayError("blocked", "blocked", false)),
    ]);
    const gateway = createGeminiGateway(transport);
    await expect(gateway.analyzeDocument(documentBlock)).rejects.toMatchObject({
      code: "blocked",
    });
    expect(transport.calls).toBe(1);
  });
});
