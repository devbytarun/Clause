import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Lazy singleton database access.
 *
 * The Postgres client and Drizzle instance are created on first use,
 * never at import time, so route modules can be imported during
 * `next build` page-data collection without a live DATABASE_URL.
 */
const globalForDb = globalThis as unknown as {
  clauseSql?: postgres.Sql;
  clauseDb?: PostgresJsDatabase<typeof schema>;
};

function getClient(): postgres.Sql {
  if (!globalForDb.clauseSql) {
    globalForDb.clauseSql = postgres(getEnv().DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }
  return globalForDb.clauseSql;
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!globalForDb.clauseDb) {
    globalForDb.clauseDb = drizzle(getClient(), { schema });
  }
  return globalForDb.clauseDb;
}

type DbRecord = Record<string | symbol, unknown>;

export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      const real = getDb() as unknown as DbRecord;
      const value = Reflect.get(real, prop, receiver);
      return typeof value === "function" ? value.bind(real) : value;
    },
  }
);
