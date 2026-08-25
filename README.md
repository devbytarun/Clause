# Clause

AI-assisted document analysis for offers, NDAs, and agreements. Extracts page-level text from PDFs, runs a structured Gemini analysis, machine-validates every AI citation against the extracted page text before display, and provides document-grounded chat that refuses to answer beyond the document.

**Not legal advice.** Analysis is informational only and never determines legality, validity, or enforceability.

## Stack

Next.js (App Router) · TypeScript · Postgres (Neon) + Drizzle · Auth.js v5 · Supabase Storage · `@google/genai` (pinned <3) with `gemini-2.5-flash` · `unpdf` · Vitest + Playwright.

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL + AUTH_SECRET minimum
pnpm db:migrate              # apply schema to a clean database
pnpm dev                     # http://localhost:3000
```

Generate a session secret: `openssl rand -base64 32`

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest suite |
| `pnpm db:generate` | Generate Drizzle migrations from schema |

## Testing

Unit tests run anywhere. The migration round-trip test requires a disposable Postgres — set `TEST_DATABASE_URL`, or rely on CI which provisions one.

```bash
TEST_DATABASE_URL=postgresql://... pnpm test
```

## Privacy posture

Documents are uploaded to cloud infrastructure and sent to Google's Gemini API for analysis. Free-tier Gemini data may be used to improve Google products; production traffic must use a paid tier. See the in-app privacy page for the full data-flow disclosure.

## Known limitations

- Scanned-PDF citations cannot be independently verified and are labeled as such.
- PDF-only (DOCX/images planned via extractor registry).
- English-language documents.
