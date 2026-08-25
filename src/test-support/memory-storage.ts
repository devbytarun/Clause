import type { StorageAdapter } from "@/lib/storage/types";

/** In-memory StorageAdapter double for integration tests. */
export function memoryStorage(): StorageAdapter & {
  objects: Map<string, Uint8Array>;
} {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    async upload(path, bytes) {
      objects.set(path, new Uint8Array(bytes));
    },
    async download(path) {
      const bytes = objects.get(path);
      if (!bytes) throw new Error(`object not found: ${path}`);
      return { bytes: new Uint8Array(bytes) };
    },
    async remove(path) {
      objects.delete(path);
    },
    async createSignedUrl(path) {
      return `signed://${path}`;
    },
  };
}
