import {
  updateStatus,
  upsertAnalysis,
  getPageTexts,
} from "@/lib/documents/repository";
import {
  DocumentProcessorError,
} from "@/lib/pipeline/document-processor";
import { buildPageMarkedText } from "@/lib/pipeline/page-markers";
import { createGeminiGateway } from "@/lib/gemini/gateway";
import { applyPolicyFilter } from "@/lib/pipeline/policy-filter";
import { validateAnalysisCitations } from "@/lib/pipeline/citation-runner";
import { GatewayError, type GeminiTransport } from "@/lib/gemini/gateway";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

/**
 * Analysis-only pipeline for the new in-memory processing flow.
 *
 * Text extraction now happens inline in the upload route. This function
 * receives the already-extracted pages and runs only the Gemini analysis
 * step, storing results in the database.
 */

export interface PipelineDeps {
  transport?: GeminiTransport;
}

function buildExtractiveSummary(pagesText: string[]): string {
  const joined = pagesText.join(" ").replace(/\s+/g, " ").trim();
  const words = joined.split(" ");
  return words.slice(0, 400).join(" ");
}

/**
 * Run the Gemini analysis pipeline on a document whose pages are
 * already extracted and stored in the database.
 *
 * Called from after() in the upload route and from the retry route.
 */
export async function runAnalysisPipeline(
  documentId: string,
  pages: { pageNumber: number; text: string }[],
  isScanned: boolean,
  deps: PipelineDeps = {}
): Promise<void> {
  try {
    const documentBlock = buildPageMarkedText(pages);

    // Shared daily Gemini budget (free-tier guard)
    const daily = await consumeRateLimit(
      "gemini:daily",
      getEnv().GEMINI_DAILY_REQUEST_LIMIT,
      86_400
    );
    if (!daily.allowed) {
      await updateStatus(documentId, "failed", { errorCode: "ai_capacity" });
      return;
    }

    const gateway = createGeminiGateway(deps.transport);
    const { result, usage } = await gateway.analyzeDocument(documentBlock);

    const filtered = applyPolicyFilter(result);
    const validated = validateAnalysisCitations(
      filtered.result,
      pages,
      isScanned
    );

    await upsertAnalysis({
      documentId,
      modelId: usage.modelId,
      result: validated.result,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      summaryText: buildExtractiveSummary(
        pages.map((p) => p.text)
      ),
    });

    await updateStatus(documentId, "ready", { errorCode: null });
  } catch (err) {
    const code = mapPipelineFailure(err);
    await updateStatus(documentId, "failed", { errorCode: code });
  }
}

/**
 * Re-run analysis for a document that already has pages in the DB.
 * Used by the retry route.
 */
export async function retryAnalysisPipeline(
  documentId: string,
  deps: PipelineDeps = {}
): Promise<void> {
  const pages = await getPageTexts(documentId);
  if (!pages || pages.length === 0) {
    await updateStatus(documentId, "failed", { errorCode: "extraction_failed" });
    return;
  }

  // Determine isScanned from char count
  const charCount = pages.reduce((sum, p) => sum + p.text.length, 0);
  const isScanned = charCount < 200;

  await runAnalysisPipeline(documentId, pages, isScanned, deps);
}

export function mapPipelineFailure(err: unknown): string {
  if (err instanceof DocumentProcessorError) return err.code;
  if (err instanceof GatewayError) return err.code;
  return "extraction_failed";
}
