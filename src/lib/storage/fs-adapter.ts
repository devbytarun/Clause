import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createHmac } from "node:crypto";
import { StorageAdapter, StorageError, StoredObject } from "@/lib/storage/types";

export interface FileSystemStorageConfig {
  baseDir?: string;
  baseUrl?: string;
  secret?: string;
}

export function createFileSystemStorageAdapter(
  config: FileSystemStorageConfig = {}
): StorageAdapter {
  const baseDir = config.baseDir ?? path.join(process.cwd(), ".storage");
  const baseUrl = config.baseUrl ?? "/api/storage/local";
  const secret =
    config.secret ??
    process.env.AUTH_SECRET ??
    "clause-dev-secret-key-default-32-chars-ok";

  function resolveSafePath(relPath: string): string {
    const rawNormalized = relPath.replace(/\\/g, "/");
    if (rawNormalized.includes("..") || rawNormalized.startsWith("/")) {
      throw new StorageError("Path traversal detected", 400);
    }
    const resolved = path.resolve(/* turbopackIgnore: true */ baseDir, path.normalize(relPath));
    const root = path.resolve(/* turbopackIgnore: true */ baseDir);
    if (!resolved.startsWith(root)) {
      throw new StorageError("Path traversal detected", 400);
    }
    return resolved;
  }

  return {
    async upload(relPath: string, bytes: Uint8Array, _mimeType: string) {
      void _mimeType;
      try {
        const fullPath = resolveSafePath(relPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, Buffer.from(bytes));
      } catch (err) {
        if (err instanceof StorageError) throw err;
        throw new StorageError(
          `Local storage upload failed: ${err instanceof Error ? err.message : String(err)}`,
          500
        );
      }
    },

    async download(relPath: string): Promise<StoredObject> {
      try {
        const fullPath = resolveSafePath(relPath);
        const buf = await fs.readFile(/* turbopackIgnore: true */ fullPath);
        return { bytes: new Uint8Array(buf) };
      } catch (err: unknown) {
        const anyErr = err as { code?: string; message?: string };
        if (anyErr?.code === "ENOENT") {
          throw new StorageError("Object not found in local storage", 404);
        }
        if (err instanceof StorageError) throw err;
        throw new StorageError(
          `Local storage download failed: ${err instanceof Error ? err.message : String(err)}`,
          500
        );
      }
    },

    async remove(relPath: string): Promise<void> {
      try {
        const fullPath = resolveSafePath(relPath);
        await fs.unlink(fullPath).catch(() => undefined);
      } catch {
        // Silently ignore deletion failures
      }
    },

    async createSignedUrl(relPath: string, ttlSeconds: number): Promise<string> {
      const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
      const normalizedPath = relPath.replace(/\\/g, "/");
      const sig = createHmac("sha256", secret)
        .update(`${normalizedPath}:${expires}`)
        .digest("hex");
      return `${baseUrl}?path=${encodeURIComponent(normalizedPath)}&expires=${expires}&sig=${sig}`;
    },
  };
}
