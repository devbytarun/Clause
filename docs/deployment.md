# Deployment & setup

## Prerequisites

Node ≥ 22, pnpm 11 (`corepack enable pnpm` or standalone), a PostgreSQL
database, a persistent private filesystem, and one Google AI Studio API key.

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
| `GOOGLE_GENERATIVE_AI_API_KEY` | for AI features | restricted key |
| `GEMINI_ANALYSIS_MODEL` / `GEMINI_CHAT_MODEL` | no | model override (defaults gemini-3.6-flash) |
| `GEMINI_ANALYSIS_THINKING_BUDGET` / `GEMINI_CHAT_THINKING_BUDGET` | no | thinking tokens (2048 / 0) |
| `SIGNED_URL_TTL_SECONDS` | no (900) | signed PDF URL lifetime |
| `DOCUMENT_RETENTION_DAYS` | no (7) | automatic document deletion window |
| `RATE_LIMIT_*` | no | upload/chat/file/retry limits |
| `CRON_SECRET` | for cleanup cron | bearer secret; empty = endpoint disabled |
| `SENTRY_DSN` | no | error tracking |

Missing required vars fail at boot with the offending names. Missing
optional integration vars disable that feature with honest UI states
(login panel, viewer) — they never crash unrelated pages.

Missing vars are validated by tests (`src/lib/env.test.ts`).

## Production deploy (Vercel)

1. Import repo; set all env vars (Production scope).
2. Run migrations against prod DB as a release step:
   `DATABASE_URL=… pnpm db:migrate`.
3. Persist `.storage/` on the host; Vercel's local filesystem is ephemeral
   and is not suitable for permanent document storage.
4. Cron: `vercel.json` schedules `/api/cron/cleanup` daily 03:00 UTC;
   set `CRON_SECRET`. Local workspace access also triggers a retention sweep.
5. Smoke test: open workspace → upload fixture → ready → citation jump → chat
   grounded answer + refusal probe → delete → 404 afterwards.
6. Record the actual PostgreSQL backup-retention value and update `/privacy`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` / `build` / `start` | dev server / prod build / serve |
| `pnpm lint` / `typecheck` / `test` | quality gates (CI runs all) |
| `pnpm e2e` | Playwright (needs configured database + running app) |
| `pnpm eval:run` | live-model evaluation harness |
| `pnpm db:generate` / `db:migrate` | Drizzle migration workflow |
| `pnpm process-document <file.pdf>` | headless pipeline CLI |
