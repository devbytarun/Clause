import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  clauseSql?: postgres.Sql;
};

function createClient(): postgres.Sql {
  return postgres(getEnv().DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

export const sql: postgres.Sql =
  globalForDb.clauseSql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.clauseSql = sql;
}

export const db = drizzle(sql, { schema });

export type Database = typeof db;
