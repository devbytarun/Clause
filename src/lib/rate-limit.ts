import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitWindows } from "@/db/schema";

/**
 * Fixed-window rate limiter (blueprint §18). Returns whether the action
 * is allowed and, when blocked, the seconds until the window resets.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function windowStartFor(windowSeconds: number): Date {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(nowMs / windowMs) * windowMs);
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const windowStart = windowStartFor(windowSeconds);

  const rows = await db
    .insert(rateLimitWindows)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitWindows.key, rateLimitWindows.windowStart],
      set: { count: sql`${rateLimitWindows.count} + 1` },
    })
    .returning({ count: rateLimitWindows.count });

  const count = rows[0]?.count ?? 1;
  const resetAt = windowStart.getTime() + windowSeconds * 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

export async function pruneRateWindows(olderThan: Date): Promise<number> {
  const deleted = await db
    .delete(rateLimitWindows)
    .where(sql`${rateLimitWindows.windowStart} < ${olderThan}`)
    .returning({ key: rateLimitWindows.key });
  return deleted.length;
}
