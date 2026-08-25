import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getDocumentForUser } from "@/lib/documents/repository";
import { getStorage } from "@/lib/storage";
import { StorageError } from "@/lib/storage/types";
import { getEnv } from "@/lib/env";

export const GET = withAuth<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const doc = await getDocumentForUser(id, ctx.userId);
  if (!doc) return jsonError(404, "not_found");

  try {
    const storage = getStorage();
    const url = await storage.createSignedUrl(
      doc.storagePath,
      getEnv().SIGNED_URL_TTL_SECONDS
    );
    return jsonOk({ url });
  } catch (err) {
    if (err instanceof StorageError) return jsonError(503, "storage_unavailable");
    throw err;
  }
});
