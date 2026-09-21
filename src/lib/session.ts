import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export const DEV_USER: SessionUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@clause.local",
  name: "Demo User",
  image: null,
};

let devUserEnsured = false;

async function ensureDevUser() {
  if (devUserEnsured) return;
  try {
    await db
      .insert(users)
      .values({
        id: DEV_USER.id,
        email: DEV_USER.email,
        name: DEV_USER.name,
        image: DEV_USER.image,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: DEV_USER.email, name: DEV_USER.name },
      });
    devUserEnsured = true;
  } catch (err) {
    console.error("Failed to ensure dev user in database:", err);
  }
}

/**
 * Resolves the signed-in user from the Supabase session and ensures a
 * matching row exists in our `users` table (id = auth.users.id).
 * If no session is found, falls back to DEV_USER so the dashboard is directly accessible.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email && user.id) {
      const email = user.email;
      const name =
        (user.user_metadata?.["full_name"] as string | undefined) ??
        (user.user_metadata?.["name"] as string | undefined) ??
        null;
      const image =
        (user.user_metadata?.["avatar_url"] as string | undefined) ?? null;

      await db
        .insert(users)
        .values({ id: user.id, email, name, image })
        .onConflictDoUpdate({
          target: users.id,
          set: { email, name: sql`coalesce(excluded.name, ${users}.name)`, image },
        });

      return { id: user.id, email, name, image };
    }
  } catch {
    // Auth unconfigured or errored — fallback to DEV_USER
  }

  await ensureDevUser();
  return DEV_USER;
}
