import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { purgeExpiredDocuments } from "@/lib/documents/retention";

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

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    await db
      .insert(users)
      .values(LOCAL_WORKSPACE_USER)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: LOCAL_WORKSPACE_USER.email,
          name: sql`coalesce(excluded.name, ${users}.name)`,
          image: LOCAL_WORKSPACE_USER.image,
        },
      });

    // Local development has no external scheduler, so sweep on access as
    // well as through the daily cleanup endpoint.
    await purgeExpiredDocuments(LOCAL_WORKSPACE_USER.id).catch(() => undefined);

    return LOCAL_WORKSPACE_USER;
  } catch {
    // Database failures remain a safe denial for API routes.
    return null;
  }
}
