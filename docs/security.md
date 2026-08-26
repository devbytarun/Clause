# Security

## Authentication & authorization

- Supabase-managed sessions in httpOnly cookies; JWT verified server-side
  on every request via `getSessionUser()`.
- Single authorization gate: `withAuth` wraps **every** API route;
  ownership is always a SQL predicate on `user_id`. Cross-user access
  returns uniform **404** (no existence leak).
- Mutating routes additionally require same-origin `Origin` header.
- Client-sent identity fields are ignored everywhere.

## Upload safety

Triple check: declared MIME whitelist + hard size cap + `%PDF-` magic
bytes; parsing happens inside pdf.js (pure JS — no native parser RCE
surface), failures mapped to stable codes; filenames sanitized of
control characters and length-capped; duplicate uploads warn but never
auto-block.

## Rate limits (Postgres fixed windows, per user unless noted)

| Action | Limit | Key |
|---|---|---|
| Uploads | 10 / hour | `uploads:{userId}` |
| Retry pipeline | 3 / hour | `retry:{documentId}` |
| Signed-URL issuance | 60 / hour | `fileurl:{userId}` |
| Chat messages | 12 / minute | `chat:{userId}` |

429 responses carry `Retry-After`; the UI surfaces cooldown copy.

## Headers & transport

Global: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
(viewer iframes load the storage domain, not our pages),
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` minimal, `poweredByHeader` off. All responses set
`Cache-Control: private, no-store`. TLS everywhere (Neon/Supabase defaults).

A strict CSP (nonce-based) is intentionally not yet enabled — documented
in [limitations.md](./limitations.md).

## Secrets & keys

Gemini key, Supabase service key, DB URL exist only in server env;
validated at boot by Zod (`src/lib/env.ts`); feature accessors fail
loudly (`requireGeminiApiKey`). Nothing secret is in
`NEXT_PUBLIC_*` except the Supabase anon key (public by design). Cron
endpoint is bearer-secret protected and fails closed when unset.

## Logs & errors

No document text, filenames, prompts, or message content is ever logged
by application code; user-facing errors come exclusively from the fixed
code→message map (`error-codes.ts`); stack traces never reach clients.

## Supply chain

pnpm lockfile committed; CI runs `pnpm audit --prod --audit-level=high`
as a gate; dependencies pinned to exact versions for framework packages.
