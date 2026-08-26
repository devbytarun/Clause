import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  getDocumentForUser,
  searchPagesForUser,
} from "@/lib/documents/repository";

export const GET = withAuth<{ id: string }>(async (req, ctx) => {
  const { id } = await ctx.params;
  const doc = await getDocumentForUser(id, ctx.userId);
  if (!doc) return jsonError(404, "not_found");

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = await searchPagesForUser(id, ctx.userId, q);
  return jsonOk({ hits });
});
