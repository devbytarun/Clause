import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";

/**
 * Shared disposable-database harness for integration tests.
 * Skips gracefully when TEST_DATABASE_URL is absent.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const globalForTestDb = globalThis as unknown as {
  __clauseTestSql?: postgres.Sql;
};

export async function getTestDb() {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL not set");
  if (!globalForTestDb.__clauseTestSql) {
    const client = postgres(TEST_DATABASE_URL, { max: 5 });
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve(__dirname, "../db/migrations"),
      migrationsTable: "__drizzle_migrations",
    });
    globalForTestDb.__clauseTestSql = client;
  }
  return { sql: globalForTestDb.__clauseTestSql, db: drizzle(globalForTestDb.__clauseTestSql) };
}
