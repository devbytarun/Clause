import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { jsonError } from "@/lib/api/response";

export interface AuthedContext {
  userId: string;
}

type RouteParams = Record<string, string>;

/**
 * Same-origin enforcement for mutating requests (blueprint §18 CSRF
 * posture): JSON+same-origin-cookie routes must present an Origin that
 * matches the request host. Safe methods are not checked.
 */
function originAllowed(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }
  const origin = req.headers.get("origin");
  if (!origin) return true; // Non-browser clients (curl) — cookie still required.
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Wraps a route handler so every document route has one server-owned
 * workspace identity. Client-sent user IDs are never trusted.
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
    if (!originAllowed(req)) {
      return jsonError(403, "bad_request");
    }
    const user = await getSessionUser();
    if (!user) return jsonError(401, "unauthorized");
    return handler(req, { ...ctx, userId: user.id });
  };
}
