/**
 * Storage abstraction (blueprint §14). Private bucket, server-side only.
 * Implemented against Supabase Storage's REST API with plain fetch —
 * no SDK dependency, fully injectable for tests.
 */

export interface StoredObject {
  bytes: Uint8Array;
}

export interface StorageAdapter {
  upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  download(path: string): Promise<StoredObject>;
  remove(path: string): Promise<void>;
  createSignedUrl(path: string, ttlSeconds: number): Promise<string>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "StorageError";
  }
}

interface SupabaseStorageConfig {
  /** Project base URL, e.g. https://xyz.supabase.co */
  url: string;
  serviceKey: string;
  bucket: string;
  fetchImpl: typeof fetch;
}

export function createSupabaseStorageAdapter(
  config: SupabaseStorageConfig
): StorageAdapter {
  const base = `${config.url.replace(/\/$/, "")}/storage/v1`;

  function headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${config.serviceKey}`,
      apikey: config.serviceKey,
      ...extra,
    };
  }

  async function assertOk(res: Response, action: string): Promise<void> {
    if (!res.ok) {
      await res.text().catch(() => "");
      throw new StorageError(
        `Storage ${action} failed (${res.status})`,
        res.status
      );
    }
  }

  return {
    async upload(path, bytes, mimeType) {
      const res = await config.fetchImpl(
        `${base}/object/${config.bucket}/${encodeURI(path)}`,
        {
          method: "POST",
          headers: headers({
            "Content-Type": mimeType,
            "x-upsert": "false",
          }),
          body: new Uint8Array(bytes),
        }
      );
      await assertOk(res, "upload");
    },

    async download(path) {
      const res = await config.fetchImpl(
        `${base}/object/${config.bucket}/${encodeURI(path)}`,
        { method: "GET", headers: headers() }
      );
      await assertOk(res, "download");
      return { bytes: new Uint8Array(await res.arrayBuffer()) };
    },

    async remove(path) {
      const res = await config.fetchImpl(
        `${base}/object/${config.bucket}/${encodeURI(path)}`,
        { method: "DELETE", headers: headers() }
      );
      await assertOk(res, "delete");
    },

    async createSignedUrl(path, ttlSeconds) {
      const res = await config.fetchImpl(
        `${base}/object/sign/${config.bucket}/${encodeURI(path)}`,
        {
          method: "POST",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ expiresIn: ttlSeconds }),
        }
      );
      await assertOk(res, "signed-url");
      const json = (await res.json()) as { signedURL?: string; signedUrl?: string };
      const signed = json.signedURL ?? json.signedUrl;
      if (!signed) throw new StorageError("Signed URL missing in response");
      return signed.startsWith("http")
        ? signed
        : `${config.url.replace(/\/$/, "")}/storage/v1${signed}`;
    },
  };
}
