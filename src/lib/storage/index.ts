import { requireStorageConfig } from "@/lib/env";
import {
  createSupabaseStorageAdapter,
  type StorageAdapter,
} from "@/lib/storage/types";
import { createFileSystemStorageAdapter } from "@/lib/storage/fs-adapter";

/**
 * Singleton storage adapter built from validated env config on first use.
 */
const globalForStorage = globalThis as unknown as {
  clauseStorage?: StorageAdapter;
};

export function getStorage(): StorageAdapter {
  if (!globalForStorage.clauseStorage) {
    const driver = process.env.STORAGE_DRIVER?.trim().toLowerCase();
    const supabaseUrl = process.env.SUPABASE_STORAGE_URL?.trim();

    // In local development or if Supabase is unconfigured/dummy domain, use local filesystem storage
    const isPlaceholderSupabase =
      !supabaseUrl ||
      supabaseUrl.includes("bhrneozzsfrzyhdwpgbh.supabase.co") ||
      supabaseUrl.includes("example.com");

    if (driver === "local" || isPlaceholderSupabase) {
      globalForStorage.clauseStorage = createFileSystemStorageAdapter();
    } else {
      try {
        const cfg = requireStorageConfig();
        globalForStorage.clauseStorage = createSupabaseStorageAdapter({
          url: cfg.url,
          serviceKey: cfg.serviceKey,
          bucket: cfg.bucket,
          fetchImpl: fetch,
        });
      } catch {
        globalForStorage.clauseStorage = createFileSystemStorageAdapter();
      }
    }
  }
  return globalForStorage.clauseStorage;
}
