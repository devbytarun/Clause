import { requireStorageConfig } from "@/lib/env";
import {
  createSupabaseStorageAdapter,
  type StorageAdapter,
} from "@/lib/storage/types";

/**
 * Singleton storage adapter built from validated env config on first use.
 */
const globalForStorage = globalThis as unknown as {
  clauseStorage?: StorageAdapter;
};

export function getStorage(): StorageAdapter {
  if (!globalForStorage.clauseStorage) {
    const cfg = requireStorageConfig();
    globalForStorage.clauseStorage = createSupabaseStorageAdapter({
      url: cfg.url,
      serviceKey: cfg.serviceKey,
      bucket: cfg.bucket,
      fetchImpl: fetch,
    });
  }
  return globalForStorage.clauseStorage;
}
