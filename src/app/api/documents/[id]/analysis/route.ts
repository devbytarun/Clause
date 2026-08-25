import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  getAnalysisForUser,
  getDocumentForUser,
} from "@/lib/documents/repository";

export const GET = withAuth<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const doc = await getDocumentForUser(id, ctx.userId);
  if (!doc) return jsonError(404, "not_found");
  if (doc.status !== "ready") return jsonError(409, "bad_request");

  const analysis = await getAnalysisForUser(id, ctx.userId);
  if (!analysis) return jsonError(404, "not_found");

  return jsonOk({
    modelId: analysis.modelId,
    result: analysis.result,
    inputTokens: analysis.inputTokens,
    outputTokens: analysis.outputTokens,
  });
});
