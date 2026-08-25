import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { jsonError } from "@/lib/api/response";

export interface AuthedContext {
  userId: string;
}

type RouteParams = Record<string, string>;

/**
 * Wraps a route handler so it only executes for authenticated users.
 * Resolves the session server-side; client-sent identity is ignored.
 */
export function withAuth<P extends RouteParams = RouteParams>(
  handler: (
    req: NextRequest,
    ctx: { params: Promise<P> } & AuthedContext
  ) => Promise<Response>
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<P> }
  ): Promise<Response> => {
    const user = await getSessionUser();
    if (!user) return jsonError(401, "unauthorized");
    return handler(req, { ...ctx, userId: user.id });
  };
}
