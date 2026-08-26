# Clause

AI-assisted document reader for offers, NDAs, and agreements. Upload a
PDF; Clause extracts page-level text, runs one structured Gemini
analysis (overview, highlights, positives, concerns separated into
fact / interpretation / uncertainty, questions), **machine-validates
every citation against the extracted text before display**, and offers
a document-grounded chat that refuses to answer beyond the document.

**Not legal advice.** Informational analysis only — never a judgment of
legality, validity, or enforceability. Numeric risk scores are excluded
from the system by design.

## Documentation

Full documentation lives in [`docs/`](./docs/index.md) — start there for
[product flow](./docs/product.md), [architecture](./docs/architecture.md),
[security](./docs/security.md), [privacy](./docs/privacy.md),
[API reference](./docs/api.md), and [deployment](./docs/deployment.md).
Architecture decisions (including deviations from the original plan) are
recorded in [`docs/decisions.md`](./docs/decisions.md).

## Stack

Next.js 16 (App Router) · TypeScript · Neon Postgres + Drizzle ·
Supabase Auth (magic links / Google) · Supabase Storage private bucket ·
`@google/genai` pinned `^2` with `gemini-2.5-flash` · `unpdf` ·
Vitest + Playwright.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # minimum: DATABASE_URL, AUTH_SECRET,
                             # Supabase URL/anon/service keys, Gemini key
pnpm db:migrate
pnpm dev                     # http://localhost:3000
```

Supabase console: enable Email provider (+ Google optionally), set the
auth callback `{APP_URL}/api/auth/callback`, create the private bucket.
Full steps: [docs/deployment.md](./docs/deployment.md).

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` / `build` | dev server / production build |
| `pnpm lint` / `typecheck` / `test` | quality gates (CI runs all three) |
| `pnpm e2e` | Playwright journey (needs configured Supabase + running app) |
| `pnpm eval:run` | live-model evaluation against `fixtures/gold.json` |
| `pnpm process-document <file.pdf>` | headless pipeline CLI (no UI) |
| `pnpm db:generate` / `db:migrate` | Drizzle migrations |

## Privacy posture

Documents are processed through cloud infrastructure and an external AI
service. The launch posture uses Gemini's free tier — content may be
used by Google for product improvement — disclosed in-product at upload
consent and sign-in. Deletion is real: soft-hide instantly, storage +
rows hard-purged nightly. See `/privacy` in the app and
[docs/privacy.md](./docs/privacy.md).

## Known limitations

Scanned-PDF citations cannot be independently verified (labeled as
such) · English documents · no DOCX/images · dashboard shows one page
of documents (API paginates) · full list:
[docs/limitations.md](./docs/limitations.md).
