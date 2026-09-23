import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

/**
 * Local-only workspace identity. There is no login gate and no Supabase
 * session: this app intentionally stores one private workspace on the
 * machine running Next.js.
 */
const LOCAL_WORKSPACE_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "local@clause.local",
  name: "Local workspace",
  image: null,
} as const;

/**
 * Cache the upsert promise so the DB round-trip happens at most once per
 * server instance instead of on every page navigation. On Vercel this
 * means once per cold start (~1 per 5-15 min) rather than every request.
 *
 * Retention sweeps are handled by the daily /api/cron/cleanup endpoint
 * and no longer run inline here — that was adding 200-400ms of latency
 * on every production page load.
 */
let ensured: Promise<true> | null = null;

function ensureUserRow(): Promise<true> {
  if (!ensured) {
    ensured = db
      .insert(users)
      .values(LOCAL_WORKSPACE_USER)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: LOCAL_WORKSPACE_USER.email,
          name: sql`coalesce(excluded.name, ${users}.name)`,
          image: LOCAL_WORKSPACE_USER.image,
        },
      })
      .then(() => true as const)
      .catch(() => {
        // Reset so the next call retries.
        ensured = null;
        throw new Error("User row upsert failed");
      });
  }
  return ensured;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    await ensureUserRow();
    return LOCAL_WORKSPACE_USER;
  } catch {
    // Database failures remain a safe denial for API routes.
    return null;
  }
}
