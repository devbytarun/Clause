import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const DEVICE_COOKIE_NAME = "clause_device_id";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function proxy(request: NextRequest) {
  const deviceCookies = request.cookies.getAll(DEVICE_COOKIE_NAME);
  const validDeviceIds = deviceCookies
    .map((cookie) => cookie.value)
    .filter((value) => UUID_REGEX.test(value));
  const hasOneUnambiguousDeviceId =
    deviceCookies.length === 1 && validDeviceIds.length === 1;
  const deviceId = hasOneUnambiguousDeviceId
    ? validDeviceIds[0]!
    : crypto.randomUUID();

  // Pass the resolved identity to the application on the same request. This
  // avoids a shared fallback during the first request before the cookie exists.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-clause-device-id", deviceId);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!hasOneUnambiguousDeviceId) {
    response.cookies.set({
      name: DEVICE_COOKIE_NAME,
      value: deviceId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
    });
  }

  // Dashboard, workspace, and API responses contain device-owned data.
  // Prevent an intermediate cache from serving one device's list to another.
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/api/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/documents/")
  ) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Vary", "Cookie");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
