import { withAuth } from "@/lib/api/with-auth";
import { jsonError } from "@/lib/api/response";
import { getDocumentForUser } from "@/lib/documents/repository";

/**
 * PDF files are now stored client-side in IndexedDB.
 * This endpoint returns 410 Gone since the server no longer holds PDF files.
 */
export const GET = withAuth<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const doc = await getDocumentForUser(id, ctx.userId);
  if (!doc) return jsonError(404, "not_found");

  return Response.json(
    {
      error: {
        code: "client_side_storage",
        message: "PDF files are stored locally in your browser. The server does not hold PDF files.",
      },
    },
    { status: 410 }
  );
});
