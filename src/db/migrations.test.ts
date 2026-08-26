import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Migration round-trip test.
 * Runs only when TEST_DATABASE_URL points at a disposable database
 * (CI provisions a Postgres service container; local runs skip).
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const d = TEST_DATABASE_URL ? describe : describe.skip;

const MIGRATIONS_FOLDER = path.resolve(__dirname, "../migrations");

let client: postgres.Sql;

d("migration round-trip", () => {
  beforeAll(async () => {
    client = postgres(TEST_DATABASE_URL!, { max: 1 });
    await migrate(drizzle(client), {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsTable: "__drizzle_migrations",
    });
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it("creates every blueprint table", async () => {
    const result = await client`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users', 'documents', 'document_pages', 'analyses',
          'conversations', 'messages'
        )
    `;
    const tables = result.map((r) => r.table_name).sort();
    expect(tables).toEqual([
      "analyses",
      "conversations",
      "document_pages",
      "documents",
      "messages",
      "users",
    ]);
  });

  it("drops legacy Auth.js tables on upgrade", async () => {
    const result = await client`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('accounts', 'sessions', 'verification_tokens')
    `;
    expect(result).toHaveLength(0);
  });

  it("enforces the mime_type CHECK constraint", async () => {
    await expect(
      (async () => {
        const [user] = await client`
          INSERT INTO users (email) VALUES ('mime-check@example.com') RETURNING id
        `;
        await client`
          INSERT INTO documents (user_id, original_filename, mime_type, size_bytes, sha256, storage_path)
          VALUES (${user!.id}, 'a.pdf', 'application/x-msdownload', 10, ${"0".repeat(64)}, 'x/1.pdf')
        `;
      })()
    ).rejects.toThrow(/documents_mime_type_check/i);
  });

  it("enforces the size cap CHECK constraint", async () => {
    await expect(
      (async () => {
        const [user] = await client`
          INSERT INTO users (email) VALUES ('size-check@example.com') RETURNING id
        `;
        await client`
          INSERT INTO documents (user_id, original_filename, mime_type, size_bytes, sha256, storage_path)
          VALUES (${user!.id}, 'big.pdf', 'application/pdf', 20971521, ${"0".repeat(64)}, 'x/2.pdf')
        `;
      })()
    ).rejects.toThrow(/documents_size_bytes_check/i);
  });

  it("enforces citext case-insensitive uniqueness on users.email", async () => {
    await client`INSERT INTO users (email) VALUES ('CaseTest@example.com')`;
    await expect(
      client`INSERT INTO users (email) VALUES ('casetest@EXAMPLE.com')`
    ).rejects.toThrow(/duplicate key|users_email_key|unique/i);
  });

  it("cascades deletes from documents to pages and analyses", async () => {
    const [user] = await client`
      INSERT INTO users (email) VALUES ('cascade-test@example.com') RETURNING id
    `;
    const [doc] = await client`
      INSERT INTO documents (user_id, original_filename, mime_type, size_bytes, sha256, storage_path)
      VALUES (${user!.id}, 'c.pdf', 'application/pdf', 100, ${"0".repeat(64)}, 'x/c.pdf')
      RETURNING id
    `;
    await client`
      INSERT INTO document_pages (document_id, page_number, text)
      VALUES (${doc!.id}, 1, 'hello world')
    `;
    await client`
      INSERT INTO analyses (document_id, model_id, status, result)
      VALUES (${doc!.id}, 'gemini-2.5-flash', 'complete', '{"overview":{}}'::jsonb)
    `;
    await client`DELETE FROM documents WHERE id = ${doc!.id}`;
    const pages = await client`
      SELECT count(*)::int AS n FROM document_pages WHERE document_id = ${doc!.id}
    `;
    const analysisRows = await client`
      SELECT count(*)::int AS n FROM analyses WHERE document_id = ${doc!.id}
    `;
    expect(pages[0]!.n).toBe(0);
    expect(analysisRows[0]!.n).toBe(0);
  });

  it("is safe to run twice (migrations are idempotent)", async () => {
    const second = postgres(TEST_DATABASE_URL!, { max: 1 });
    try {
      await migrate(drizzle(second), {
        migrationsFolder: MIGRATIONS_FOLDER,
        migrationsTable: "__drizzle_migrations",
      });
    } finally {
      await second.end();
    }
  });
});
