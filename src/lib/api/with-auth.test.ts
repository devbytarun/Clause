import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getSessionUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({
  getSessionUser: getSessionUserMock,
}));

const { withAuth } = await import("@/lib/api/with-auth");

function makeReq(): NextRequest {
  return new NextRequest("http://localhost:3000/api/test");
}

describe("withAuth", () => {
  it("returns uniform 401 JSON when no session exists", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const handler = vi.fn();
    const wrapped = withAuth(handler);

    const res = await wrapped(makeReq(), { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthorized");
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes userId to the handler when authenticated", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      email: "a@b.com",
      name: null,
      image: null,
    });
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withAuth(handler);

    const res = await wrapped(makeReq(), {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    const ctx = handler.mock.calls[0]![1];
    expect(ctx.userId).toBe("11111111-1111-1111-1111-111111111111");
    expect(await ctx.params).toEqual({ id: "abc" });
  });

  it("ignores client-supplied identity entirely", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "22222222-2222-2222-2222-222222222222",
      email: "x@y.com",
      name: null,
      image: null,
    });
    let seenUserId = "";
    const wrapped = withAuth(async (_req, ctx) => {
      seenUserId = ctx.userId;
      return new Response("ok");
    });

    const req = new NextRequest(
      "http://localhost:3000/api/test?userId=hacker-id"
    );
    req.headers.set("x-user-id", "hacker-id");

    await wrapped(req, { params: Promise.resolve({}) });
    expect(seenUserId).toBe("22222222-2222-2222-2222-222222222222");
  });
});
