import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  getOrCreateConversation,
  listMessages,
  streamChatTurn,
} from "@/lib/chat/service";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { and, eq } from "drizzle-orm";



async function assertConversationAccess(documentId: string, userId: string) {
  const rows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.documentId, documentId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export const GET = withAuth<{ documentId: string }>(async (req, ctx) => {
  const { documentId } = await ctx.params;

  const conv = await assertConversationAccess(documentId, ctx.userId);
  if (!conv) return jsonOk({ messages: [], nextBeforeId: null });

  const url = new URL(req.url);
  const beforeRaw = url.searchParams.get("before");
  const beforeId = beforeRaw ? Number(beforeRaw) : undefined;

  const page = await listMessages(conv.id, {
    beforeId:
      beforeId !== undefined && Number.isInteger(beforeId) && beforeId > 0
        ? beforeId
        : undefined,
  });
  return jsonOk(page);
});

export const POST = withAuth<{ documentId: string }>(async (req, ctx) => {
  const { documentId } = await ctx.params;

  let body: { content?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "bad_request");
  }
  const content =
    typeof body.content === "string" ? body.content.trim() : "";
  if (content.length === 0 || content.length > 2000) {
    return jsonError(400, "bad_request");
  }

  // Per-user chat rate limit (blueprint §18): 12 msgs/min.
  const rl = await consumeRateLimit(`chat:${ctx.userId}`, 12, 60);
  if (!rl.allowed) {
    return Response.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many messages. Please wait a moment.",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const conv = await getOrCreateConversation(documentId, ctx.userId);
  void conv;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const result = await streamChatTurn(documentId, ctx.userId, content, {
          onDelta: (t) => send("delta", { t }),
        });

        if (result.ok) {
          send("done", {
            messageId: result.messageId,
            sources: result.sources,
          });
        } else {
          send("error", { code: result.code });
        }
      } catch (err) {
        send("error", {
          code: "provider_error",
          message: err instanceof Error ? err.message : undefined,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-store",
      Connection: "keep-alive",
    },
  });
});
