import { NextResponse } from "next/server";
import { errorMessage, type ErrorCode } from "@/lib/error-codes";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function jsonError(status: number, code: ErrorCode): NextResponse {
  return NextResponse.json(
    { error: { code, message: errorMessage(code) } },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
