import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const DEVICE_COOKIE_NAME = "clause_device_id";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function proxy(request: NextRequest) {
  const existingId = request.cookies.get(DEVICE_COOKIE_NAME)?.value;

  if (existingId && UUID_REGEX.test(existingId)) {
    return NextResponse.next();
  }

  const deviceId = crypto.randomUUID();

  // Forward cookie to current request headers so Server Components on the first render see it
  request.cookies.set(DEVICE_COOKIE_NAME, deviceId);
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Set persistent cookie on the response for the browser
  response.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: deviceId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
