import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { StorageError } from "@/lib/storage/types";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const expiresStr = searchParams.get("expires");
  const sig = searchParams.get("sig");

  if (!path) {
    return new NextResponse("Missing path", { status: 400 });
  }

  // Security check: prevent directory traversal
  const normalized = path.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.startsWith("/")) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const secret =
    process.env.AUTH_SECRET ?? "clause-dev-secret-key-default-32-chars-ok";
  let verified = false;

  if (sig && expiresStr) {
    const expires = parseInt(expiresStr, 10);
    const now = Math.floor(Date.now() / 1000);
    if (!isNaN(expires) && expires >= now) {
      const expectedSig = createHmac("sha256", secret)
        .update(`${normalized}:${expires}`)
        .digest("hex");
      if (
        sig.length === expectedSig.length &&
        timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
      ) {
        verified = true;
      }
    }
  }

  if (!verified) {
    const user = await getSessionUser();
    if (user && normalized.startsWith(`${user.id}/`)) {
      verified = true;
    }
  }

  if (!verified) {
    return new NextResponse("Unauthorized or expired link", { status: 403 });
  }

  try {
    const storage = getStorage();
    const stored = await storage.download(normalized);
    const bytes = stored.bytes;
    const rangeHeader = req.headers.get("range");
    const rangeMatch = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);

    if (rangeMatch) {
      const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
      const requestedEnd = rangeMatch[2]
        ? Number(rangeMatch[2])
        : bytes.length - 1;
      const end = Math.min(requestedEnd, bytes.length - 1);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        start > end ||
        start >= bytes.length
      ) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${bytes.length}` },
        });
      }

      const chunk = bytes.slice(start, end + 1);
      return new NextResponse(chunk as unknown as BodyInit, {
        status: 206,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
          "Accept-Ranges": "bytes",
          "Content-Disposition": "inline",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Accept-Ranges": "bytes",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof StorageError && err.status === 404) {
      return new NextResponse("Document not found", { status: 404 });
    }
    return new NextResponse("Failed to read document", { status: 500 });
  }
}
