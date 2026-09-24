import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export const DEVICE_COOKIE_NAME = "clause_device_id";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FALLBACK_USER_ID = "00000000-0000-4000-8000-000000000001";

/**
 * In-memory cache of ensured users during this server process lifecycle,
 * so we only do a database upsert once per device per process rather than
 * on every single page load or API request.
 */
const ensuredUsers = new Set<string>();

async function ensureDeviceUser(userId: string): Promise<void> {
  if (ensuredUsers.has(userId)) return;

  const email = `${userId}@clause.local`;
  await db
    .insert(users)
    .values({
      id: userId,
      email,
      name: "Workspace",
      image: null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        name: sql`coalesce(excluded.name, ${users}.name)`,
      },
    });

  ensuredUsers.add(userId);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    let userId = FALLBACK_USER_ID;

    try {
      const cookieStore = await cookies();
      const cookieVal = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
      if (cookieVal && UUID_REGEX.test(cookieVal)) {
        userId = cookieVal;
      }
    } catch {
      // In contexts where cookies() is not available (e.g. standalone scripts),
      // gracefully fall back to default workspace ID.
    }

    await ensureDeviceUser(userId);

    return {
      id: userId,
      email: `${userId}@clause.local`,
      name: "Workspace",
      image: null,
    };
  } catch (err) {
    console.error("Session resolution error:", err);
    return null;
  }
}
