import { getStorage } from "@/lib/storage";
import {
  claimQueuedDocument,
  getStoragePath,
  replacePages,
  updateStatus,
  upsertAnalysis,
} from "@/lib/documents/repository";
import {
  processDocument,
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
 * Document pipeline service (blueprint §8 steps 6–14).
 *
 * Idempotency: a document is claimed via a conditional status UPDATE
 * (queued→extracting), so double-triggered runs are no-ops. Failures
 * set status=failed with a stable error_code; the storage object is
 * kept so the user can retry or delete.
 */

export interface PipelineDeps {
  transport?: GeminiTransport;
  storage?: ReturnType<typeof getStorage>;
}

function buildExtractiveSummary(pagesText: string[]): string {
  const joined = pagesText.join(" ").replace(/\s+/g, " ").trim();
  const words = joined.split(" ");
  return words.slice(0, 400).join(" ");
}

export async function runDocumentPipeline(
  documentId: string,
  deps: PipelineDeps = {}
): Promise<{ claimed: boolean }> {
  const claimed = await claimQueuedDocument(documentId, "queued");
  if (!claimed) return { claimed: false };

  const storage = deps.storage ?? getStorage();

  try {
    const storagePath = await getStoragePath(documentId);
    if (!storagePath) throw new Error("storage_path_missing");

    const object = await storage.download(storagePath);

    await updateStatus(documentId, "extracting");
    const processed = await processDocument(object.bytes);

    await replacePages(documentId, processed.pages);
    await updateStatus(documentId, "analyzing", {
      pageCount: processed.pageCount,
      charCount: processed.charCount,
      isScanned: processed.isScanned,
    });

    const documentBlock = buildPageMarkedText(processed.pages);

    // Shared daily Gemini budget (free-tier guard, D-002): one unit per
    // analysis attempt. Consumed only when we are about to call the model.
    const daily = await consumeRateLimit(
      "gemini:daily",
      getEnv().GEMINI_DAILY_REQUEST_LIMIT,
      86_400
    );
    if (!daily.allowed) {
      await updateStatus(documentId, "failed", { errorCode: "ai_capacity" });
      return { claimed: true };
    }

    const gateway = createGeminiGateway(deps.transport);
    const { result, usage } = await gateway.analyzeDocument(documentBlock);

    const filtered = applyPolicyFilter(result);
    const validated = validateAnalysisCitations(
      filtered.result,
      processed.pages,
      processed.isScanned
    );

    await upsertAnalysis({
      documentId,
      modelId: usage.modelId,
      result: validated.result,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      summaryText: buildExtractiveSummary(
        processed.pages.map((p) => p.text)
      ),
    });

    await updateStatus(documentId, "ready", { errorCode: null });
    return { claimed: true };
  } catch (err) {
    const code = mapPipelineFailure(err);
    await updateStatus(documentId, "failed", { errorCode: code });
    return { claimed: true };
  }
}

export function mapPipelineFailure(err: unknown): string {
  if (err instanceof DocumentProcessorError) return err.code;
  if (err instanceof GatewayError) return err.code;
  return "extraction_failed";
}
