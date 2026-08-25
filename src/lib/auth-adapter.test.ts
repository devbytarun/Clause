import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import postgres from "postgres";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const d = TEST_DATABASE_URL ? describe : describe.skip;

let client: postgres.Sql;

d("Auth.js Drizzle adapter contract", () => {
  let adapter: ReturnType<typeof DrizzleAdapter>;

  beforeAll(async () => {
    client = postgres(TEST_DATABASE_URL!, { max: 1 });
    const db = drizzle(client);
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, "../../db/migrations"),
      migrationsTable: "__drizzle_migrations",
    });
    adapter = DrizzleAdapter(db) as ReturnType<typeof DrizzleAdapter>;
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it("creates and fetches users by email", async () => {
    const created = await adapter.createUser!({
      id: crypto.randomUUID(),
      name: "Ada",
      email: `ada-${Date.now()}@example.com`,
      emailVerified: null,
    });
    expect(created.id).toBeTruthy();

    const found = await adapter.getUserByEmail!(created.email);
    expect(found?.id).toBe(created.id);

    const byId = await adapter.getUser!(created.id);
    expect(byId?.email).toBe(created.email);
  });

  it("links accounts and resolves user by account", async () => {
    const user = await adapter.createUser!({
      id: crypto.randomUUID(),
      name: null,
      email: `oa-${Date.now()}@example.com`,
      emailVerified: null,
    });
    await adapter.linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "google",
      providerAccountId: `acc-${user.id}`,
      refresh_token: undefined,
      access_token: undefined,
      expires_at: undefined,
      token_type: undefined,
      scope: undefined,
      id_token: undefined,
      session_state: undefined,
    });

    const resolved = await adapter.getUserByAccount!({
      provider: "google",
      providerAccountId: `acc-${user.id}`,
    });
    expect(resolved?.id).toBe(user.id);
  });

  it("stores and retrieves database sessions", async () => {
    const user = await adapter.createUser!({
      id: crypto.randomUUID(),
      name: null,
      email: `sess-${Date.now()}@example.com`,
      emailVerified: null,
    });
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    await adapter.createSession!({
      sessionToken: `tok-${user.id}`,
      userId: user.id,
      expires,
    });

    const session = await adapter.getSessionAndUser!(`tok-${user.id}`);
    expect(session?.user.id).toBe(user.id);
    expect(session?.session.expires).toEqual(expires);

    await adapter.deleteSession!(`tok-${user.id}`);
    const gone = await adapter.getSessionAndUser!(`tok-${user.id}`);
    expect(gone).toBeNull();
  });

  it("handles verification tokens for magic links", async () => {
    const identifier = `magic-${Date.now()}@example.com`;
    await adapter.createVerificationToken!({
      identifier,
      token: `vtoken-${identifier}`,
      expires: new Date(Date.now() + 15 * 60 * 1000),
    });

    const used = await adapter.useVerificationToken!({
      identifier,
      token: `vtoken-${identifier}`,
    });
    expect(used?.identifier).toBe(identifier);

    const replayed = await adapter.useVerificationToken!({
      identifier,
      token: `vtoken-${identifier}`,
    });
    expect(replayed).toBeNull();
  });

  it("deletes users and cascades their sessions", async () => {
    const user = await adapter.createUser!({
      id: crypto.randomUUID(),
      name: null,
      email: `del-${Date.now()}@example.com`,
      emailVerified: null,
    });
    await adapter.createSession!({
      sessionToken: `del-tok-${user.id}`,
      userId: user.id,
      expires: new Date(Date.now() + 3600 * 1000),
    });

    const removed = await adapter.deleteUser!(user.id);
    expect(removed?.id).toBe(user.id);
    expect(await adapter.getUser!(user.id)).toBeNull();
    expect(await adapter.getSessionAndUser!(`del-tok-${user.id}`)).toBeNull();
  });
});
