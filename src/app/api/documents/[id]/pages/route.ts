import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  getDocumentForUser,
  getPageForUser,
} from "@/lib/documents/repository";

export const GET = withAuth<{ id: string }>(async (req, ctx) => {
  const { id } = await ctx.params;
  const doc = await getDocumentForUser(id, ctx.userId);
  if (!doc) return jsonError(404, "not_found");

  const rawPage = new URL(req.url).searchParams.get("page");
  if (rawPage === null) return jsonError(400, "bad_request");

  const pageNumber = Number(rawPage);
  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    (doc.pageCount !== null && pageNumber > doc.pageCount)
  ) {
    return jsonError(416, "bad_request");
  }

  const page = await getPageForUser(id, ctx.userId, pageNumber);
  if (!page && (doc.status === "ready" || doc.status === "failed")) {
    return jsonError(416, "bad_request");
  }
  if (!page) return jsonError(409, "bad_request");

  return jsonOk({ pageNumber: page.pageNumber, text: page.text });
});
