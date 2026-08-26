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

/**
 * Resolves the signed-in user from the Supabase session and ensures a
 * matching row exists in our `users` table (id = auth.users.id).
 * All downstream ownership checks keep using this id unchanged.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    // Auth not configured on this deployment — nobody is signed in.
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !user.id) return null;

  const email = user.email;
  const name =
    (user.user_metadata?.["full_name"] as string | undefined) ??
    (user.user_metadata?.["name"] as string | undefined) ??
    null;
  const image = (user.user_metadata?.["avatar_url"] as string | undefined) ?? null;

  await db
    .insert(users)
    .values({ id: user.id, email, name, image })
    .onConflictDoUpdate({
      target: users.id,
      set: { email, name: sql`coalesce(excluded.name, ${users}.name)`, image },
    });

  return { id: user.id, email, name, image };
}
