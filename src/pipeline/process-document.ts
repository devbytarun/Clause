import { readFile } from "node:fs/promises";
import { buildPageMarkedText } from "@/lib/pipeline/page-markers";
import {
  processDocument,
  DocumentProcessorError,
  type ProcessedDocument,
} from "@/lib/pipeline/document-processor";
import { createGeminiGateway, GatewayError } from "@/lib/gemini/gateway";
import { applyPolicyFilter } from "@/lib/pipeline/policy-filter";
import { validateAnalysisCitations } from "@/lib/pipeline/citation-runner";
import type { AnalysisResult } from "@/lib/schemas/analysis";

/**
 * Full proof pipeline (blueprint §8 steps 7–14, CLI-first per Phase 2):
 * parse → extract → analyze → policy-filter → citation-validate.
 *
 * Persistence and storage arrive in Phase 3; this module is the
 * headless core both the CLI and the API route will call.
 */

export interface PipelineOutcome {
  document: ProcessedDocument;
  analysis: AnalysisResult;
  usage: { modelId: string; inputTokens: number; outputTokens: number };
  repairUsed: boolean;
  policyRemovedItems: number;
  citationStats: {
    total: number;
    verified: number;
    verifiedFuzzy: number;
    pageCorrected: number;
    unverified: number;
  };
}

export async function runPipeline(
  pdfBytes: Uint8Array,
  options: { transport?: Parameters<typeof createGeminiGateway>[0] } = {}
): Promise<PipelineOutcome> {
  const processed = await processDocument(pdfBytes);
  const documentBlock = buildPageMarkedText(processed.pages);

  const gateway = createGeminiGateway(options.transport);
  const { result, usage, repairUsed } =
    await gateway.analyzeDocument(documentBlock);

  const filtered = applyPolicyFilter(result);
  const validated = validateAnalysisCitations(
    filtered.result,
    processed.pages,
    processed.isScanned
  );

  return {
    document: processed,
    analysis: validated.result,
    usage: {
      modelId: usage.modelId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    },
    repairUsed,
    policyRemovedItems: filtered.removedItems,
    citationStats: validated.stats,
  };
}

export function mapPipelineError(err: unknown): string | null {
  if (err instanceof DocumentProcessorError) return err.code;
  if (err instanceof GatewayError) return err.code;
  if (
    err instanceof Error &&
    /GOOGLE_GENERATIVE_AI_API_KEY is required/.test(err.message)
  ) {
    return "missing_api_key";
  }
  return null;
}

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: pnpm process-document <path/to/file.pdf>");
    process.exit(2);
  }

  try {
    const bytes = await readFile(filePath);
    const outcome = await runPipeline(new Uint8Array(bytes));

    console.log(
      JSON.stringify(
        {
          document: {
            pageCount: outcome.document.pageCount,
            charCount: outcome.document.charCount,
            isScanned: outcome.document.isScanned,
          },
          usage: outcome.usage,
          repairUsed: outcome.repairUsed,
          policyRemovedItems: outcome.policyRemovedItems,
          citationStats: outcome.citationStats,
          analysis: outcome.analysis,
        },
        null,
        2
      )
    );
  } catch (err) {
    const code = mapPipelineError(err);
    console.error(
      JSON.stringify({
        ok: false,
        code: code ?? "unknown_error",
        message: err instanceof Error ? err.message : String(err),
      })
    );
    process.exit(1);
  }
}

const isDirectInvocation =
  typeof process !== "undefined" &&
  process.argv[1]?.replace(/\\/g, "/").includes("process-document");

if (isDirectInvocation) {
  void main();
}
