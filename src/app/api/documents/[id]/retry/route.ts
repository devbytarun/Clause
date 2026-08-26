import { after } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  getDocumentForUser,
  updateStatus,
} from "@/lib/documents/repository";
import { runDocumentPipeline } from "@/lib/pipeline/service";
import { consumeRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const MAX_ATTEMPTS_PER_DOC = 3;

export const POST = withAuth<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const doc = await getDocumentForUser(id, ctx.userId);
  if (!doc) return jsonError(404, "not_found");

  if (doc.status !== "failed") {
    return jsonError(409, "bad_request");
  }
  if (doc.attempts >= MAX_ATTEMPTS_PER_DOC) {
    return jsonError(429, "rate_limited");
  }

  // Retry limit (blueprint §18): 3/hour per document.
  const rl = await consumeRateLimit(`retry:${id}`, 3, 3600);
  if (!rl.allowed) return jsonError(429, "rate_limited");

  await updateStatus(id, "queued", { errorCode: null });

  // Kick the pipeline in the background; status flips queued→extracting.
  after(async () => {
    await runDocumentPipeline(id).catch(() => undefined);
  });

  return jsonOk({ status: "queued" });
});
