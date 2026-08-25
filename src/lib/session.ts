import { auth } from "@/lib/auth";
import type { User } from "@/db/schema";

export type SessionUser = Pick<User, "id" | "email" | "name" | "image">;

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };
}
