# Deployment & setup

## Prerequisites

Node ≥ 22, pnpm 11 (`corepack enable pnpm` or standalone). One Supabase
project (auth + storage), one Neon project (Postgres), one Google AI
Studio API key.

## Local setup

```bash
pnpm install
cp .env.example .env.local     # fill values below
pnpm db:migrate                # applies migrations to a clean database
pnpm fixtures:generate         # (re)create fixture PDFs if needed
pnpm dev                       # http://localhost:3000
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `AUTH_SECRET` | yes | generic app secret (≥32 chars) |
| `APP_URL` | no (default localhost:3000) | absolute URL for redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | for login/storage | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for login/storage | public anon key |
| `SUPABASE_SERVICE_KEY` | for uploads/purge | server-only service key |
| `STORAGE_BUCKET` | no (default docs-prod) | private bucket name |
| `GOOGLE_GENERATIVE_AI_API_KEY` | for AI features | restricted key |
| `GEMINI_ANALYSIS_MODEL` / `GEMINI_CHAT_MODEL` | no | model override (defaults gemini-2.5-flash) |
| `GEMINI_ANALYSIS_THINKING_BUDGET` / `GEMINI_CHAT_THINKING_BUDGET` | no | thinking tokens (2048 / 0) |
| `SIGNED_URL_TTL_SECONDS` | no (900) | signed PDF URL lifetime |
| `RATE_LIMIT_*` | no | upload/chat/file/retry limits |
| `CRON_SECRET` | for cleanup cron | bearer secret; empty = endpoint disabled |
| `SENTRY_DSN` | no | error tracking |

Missing required vars fail at boot with the offending names. Missing
optional integration vars disable that feature with honest UI states
(login panel, viewer) — they never crash unrelated pages.

Missing vars are validated by tests (`src/lib/env.test.ts`).

## Supabase console steps

1. Auth → Providers: enable Email (magic link) and optionally Google.
2. Auth → URL configuration: add `{APP_URL}/api/auth/callback`.
3. Storage: create **private** bucket named per `STORAGE_BUCKET`
   (versioning off).

## Production deploy (Vercel)

1. Import repo; set all env vars (Production scope).
2. Run migrations against prod DB as a release step:
   `DATABASE_URL=… pnpm db:migrate`.
3. Cron: `vercel.json` schedules `/api/cron/cleanup` daily 03:00 UTC;
   set `CRON_SECRET` in both Vercel env and the cron header config.
4. Smoke test: sign in → upload fixture → ready → citation jump → chat
   grounded answer + refusal probe → delete → 404 afterwards.
5. Record the actual Neon backup-retention value and update `/privacy`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` / `build` / `start` | dev server / prod build / serve |
| `pnpm lint` / `typecheck` / `test` | quality gates (CI runs all) |
| `pnpm e2e` | Playwright (needs configured Supabase + running app) |
| `pnpm eval:run` | live-model evaluation harness |
| `pnpm db:generate` / `db:migrate` | Drizzle migration workflow |
| `pnpm process-document <file.pdf>` | headless pipeline CLI |
