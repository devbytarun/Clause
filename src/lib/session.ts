import { cookies, headers } from "next/headers";
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

const TEST_FALLBACK_USER_ID = "00000000-0000-4000-8000-000000000001";

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
    let userId: string | null = null;

    // Proxy resolves the device identity before the request reaches the app.
    // Prefer that value so duplicate/stale browser cookies cannot make the
    // page render under a different workspace than the upload API.
    try {
      const headerVal = (await headers()).get("x-clause-device-id");
      if (headerVal && UUID_REGEX.test(headerVal)) {
        userId = headerVal;
      }
    } catch {
      // In contexts where request headers are unavailable, inspect cookies.
    }

    try {
      const cookieStore = await cookies();
      const cookieVal = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
      if (!userId && cookieVal && UUID_REGEX.test(cookieVal)) {
        userId = cookieVal;
      }
    } catch {
      // In contexts where cookies() is not available (e.g. standalone scripts)
    }

    // If neither the proxy header nor a cookie was found:
    // In test environment: use deterministic test ID.
    // In production/dev: generate a unique ID on the fly so no request falls
    // back to one shared workspace when a cookie is unavailable.
    if (!userId) {
      if (process.env.NODE_ENV === "test") {
        userId = TEST_FALLBACK_USER_ID;
      } else {
        userId = crypto.randomUUID();
      }
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
