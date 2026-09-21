import { describe, expect, it, afterAll } from "vitest";
import { createFileSystemStorageAdapter } from "./fs-adapter";
import * as path from "node:path";
import * as fs from "node:fs/promises";

describe("createFileSystemStorageAdapter", () => {
  const testDir = path.join(process.cwd(), ".storage_test");
  const adapter = createFileSystemStorageAdapter({
    baseDir: testDir,
    baseUrl: "/api/storage/local",
    secret: "test-secret-at-least-32-characters-long",
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it("uploads and downloads bytes correctly", async () => {
    const data = new TextEncoder().encode("Hello PDF content");
    await adapter.upload("user-1/doc-1.pdf", data, "application/pdf");

    const downloaded = await adapter.download("user-1/doc-1.pdf");
    const text = new TextDecoder().decode(downloaded.bytes);
    expect(text).toBe("Hello PDF content");
  });

  it("generates signed URL with expiration and HMAC signature", async () => {
    const url = await adapter.createSignedUrl("user-1/doc-1.pdf", 3600);
    expect(url).toContain("/api/storage/local?path=");
    expect(url).toContain("expires=");
    expect(url).toContain("sig=");
  });

  it("removes files correctly", async () => {
    await adapter.remove("user-1/doc-1.pdf");
    await expect(adapter.download("user-1/doc-1.pdf")).rejects.toThrow();
  });

  it("guards against directory traversal", async () => {
    const data = new TextEncoder().encode("Attack");
    await expect(
      adapter.upload("../../../secret.txt", data, "text/plain")
    ).rejects.toThrow(/traversal/i);
  });
});
