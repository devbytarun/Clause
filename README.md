# Clause

### Evidence-first document understanding for contracts and agreements

Clause turns a dense PDF into a clear review workspace. Upload an offer
letter, NDA, or agreement and get a structured explanation of what it says,
what deserves attention, what may be missing, and what to ask next—always
with page-level evidence.

> Clause provides informational analysis only. It is not legal advice and
> does not determine whether a document is legal, valid, or enforceable.

## The product

Clause is built around a simple promise: help people understand an important
document before they sign it.

- **Structured review** — overview, highlights, positive provisions,
  concerns, omissions, and questions worth asking.
- **Evidence at the source** — findings carry page references and exact
  supporting quotes.
- **Citation validation** — evidence is checked against the extracted page
  text before it is shown. Weak or scanned-document evidence is marked
  accordingly.
- **Document-only Q&A** — the assistant stays anchored to the uploaded
  document instead of becoming a general-purpose chatbot.
- **Practical next steps** — separate what the document says, what it may
  mean, what is uncertain, and what the reader can clarify.
- **Side-by-side workspace** — read the PDF while reviewing findings and jump
  directly to cited pages.
- **Local document lifecycle** — one private workspace, ownership checks,
  signed file URLs, retryable processing, rate limits, manual deletion, and
  automatic deletion after seven days.

## How it works

```text
Upload PDF
    ↓
Validate, fingerprint, and store privately
    ↓
Extract page-level text
    ↓
Generate one structured document analysis
    ↓
Validate every finding against its source page
    ↓
Review evidence, ask grounded questions, and take action
```

The pipeline is intentionally evidence-first: the model can propose an
analysis, but the application decides which citations are trustworthy enough
to display.

## Current capabilities

| Area | What Clause provides |
|---|---|
| Documents | PDF uploads up to 20 MB and 120 pages |
| Analysis | Overview, highlights, positives, concerns, and questions |
| Evidence | Exact, fuzzy, corrected-page, and unverified citation states |
| Viewer | Signed PDF viewer, page navigation, search, and citation deep-links |
| Q&A | Streaming answers grounded in the current document |
| Accounts | No login required; one local workspace on the host machine |
| Storage | Local filesystem under `.storage/` plus PostgreSQL metadata; 7-day retention |
| Operations | Upload progress, processing status, retry, duplicate detection, and delete |

## Technology

- Next.js 16 App Router and React 19
- TypeScript
- PostgreSQL with Drizzle ORM
- Local filesystem storage
- Gemini through `@google/genai`
- `unpdf` for deterministic page-level PDF extraction
- Tailwind CSS 4 and Lucide icons
- Vitest and Playwright

## Quick start

Requirements: Node.js 22+ and pnpm 11+.

```bash
pnpm install
Copy-Item .env.example .env.local
```

Configure the required values in `.env.local`:

- `DATABASE_URL`
- `AUTH_SECRET` (at least 32 characters)
- `GOOGLE_GENERATIVE_AI_API_KEY`

No account, email, OTP, Google provider, or Supabase project is needed. PDFs
are saved under `.storage/` and metadata is stored in PostgreSQL. This is a
server-side local workspace, not browser-only storage: refreshing the browser
does not lose documents. Run it on a private machine with a persistent disk;
Vercel's filesystem is ephemeral and is not suitable for this storage mode.

Then run the database and app:

```bash
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Build the production app |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run the Vitest suite |
| `pnpm e2e` | Run Playwright journeys |
| `pnpm db:generate` | Generate a Drizzle migration |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm process-document <file.pdf>` | Run the document pipeline from the command line |
| `pnpm eval:run` | Run the live-model evaluation harness |

## Project layout

```text
src/app/                         Routes, pages, and API handlers
src/components/                  Dashboard, viewer, analysis, and chat UI
src/lib/pipeline/                Upload processing and citation validation
src/lib/chat/                    Context assembly and grounded Q&A
src/lib/gemini/                  Model gateway and retry behavior
src/lib/documents/               Ownership-checked persistence
src/db/                          Schema and migrations
fixtures/                        Deterministic PDF and evaluation fixtures
e2e/                              Playwright user journeys
docs/                             Product, architecture, privacy, and deployment docs
```

## Privacy and safety

Clause stores PDFs on the local filesystem and sends extracted text and
document-grounded chat context to the external AI provider configured by
`GOOGLE_GENERATIVE_AI_API_KEY`. The product discloses this during upload
consent. Local storage protects data from being stored in a separate file
hosting service, but it is not a guarantee that content never leaves the
machine. File URLs are signed, documents are deleted after seven days, and
manual deletion removes the document from the active workspace and local
storage immediately.

The analysis system also avoids numeric legal-risk scores, enforceability
verdicts, and unsupported claims about applicable law.

## Known limitations

- Image-only/scanned PDFs are detected, but OCR is not yet enabled.
- Scanned-document citations cannot be independently verified.
- English is the primary supported language.
- DOCX, image uploads, multi-document comparison, sharing, and collaboration
  are not part of the current MVP.
- Gemini is still an external processor. A fully private deployment requires a
  local AI model or another processor with an appropriate no-training policy.

See the full [documentation index](./docs/index.md), including the
[product scope](./docs/product.md), [architecture](./docs/architecture.md),
[pipeline](./docs/pipeline.md), [privacy model](./docs/privacy.md),
[testing strategy](./docs/testing.md), and [roadmap](./docs/roadmap.md).
