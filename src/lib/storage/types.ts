/** Local filesystem storage abstraction used by the private server routes. */

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
