import type { StorageAdapter } from "@/lib/storage/types";
import { createFileSystemStorageAdapter } from "@/lib/storage/fs-adapter";

/**
 * Singleton storage adapter built from validated env config on first use.
 */
const globalForStorage = globalThis as unknown as {
  clauseStorage?: StorageAdapter;
};

export function getStorage(): StorageAdapter {
  if (!globalForStorage.clauseStorage) {
    globalForStorage.clauseStorage = createFileSystemStorageAdapter();
  }
  return globalForStorage.clauseStorage;
}
