# Architecture

```
Browser (Next.js React, server components + client islands)
  │  same-origin requests to one local workspace
  ▼
Next.js Route Handlers / Server Components (Node runtime)
  ├── withAuth wrapper ──── fixed local workspace → userId; origin check
  ├── DocumentsService ──── local filesystem (`.storage/`, signed URLs
  │                          ≤ 15 min)
  ├── DocumentProcessor ─── unpdf per-page text ──► document_pages
  ├── ChatService ─┐
  │   ContextBuilder├────► GeminiGateway (@google/genai, server-only,
  │   CitationValidator     env-pinned models, retries, usage accounting)
  └── RateLimiter ─► Postgres fixed-window table
                                   │ HTTPS
                                   ▼
                            Google Gemini API

PostgreSQL: users · documents · document_pages · analyses ·
conversations · messages · rate_limit_windows
```

Rules enforced in code:

- The browser never touches Gemini or storage credentials.
- All ownership filtering happens in SQL predicates (`user_id`), never
  in application post-filtering.
- Gemini specifics exist in exactly one module (`src/lib/gemini/gateway.ts`);
  storage specifics in `src/lib/storage/*`; chat grounding rules in
  `src/lib/chat/prompts.ts`.

## Stack — what we chose and why

| Layer | Chosen | Why | Alternatives considered | Why rejected | Trade-off accepted | Reconsider when |
|---|---|---|---|---|---|---|
| Framework | Next.js 16 App Router + TS | one deployable; RSC for server-heavy pages; SSE-capable route handlers | FastAPI + React SPA | two deployables, slower iteration | framework churn risk | a second product surface (mobile app) needs a standalone API |
| UI | Tailwind v4 + hand-rolled components | full design control (sunset theme); no component-library lock-in | shadcn/ui, MUI | generic look; extra deps | more bespoke CSS to maintain | team grows and consistency needs enforcement tooling |
| DB | PostgreSQL + Drizzle | portable, typed SQL, and simple local deployment | SQLite | weaker concurrent processing semantics | one database service remains required | single-file local mode becomes a priority |
| Auth | Fixed local workspace | no account setup and no identity leaves the machine | Hosted auth | unnecessary for the single-user MVP | local machine access is the security boundary | multi-user sharing or hosted accounts are added |
| Storage | Local filesystem adapter | keeps document bytes on the host and is easy to inspect/delete | S3, Vercel Blob | hosted storage changes the privacy posture and adds setup | persistent disk management is required | multi-user hosted deployment becomes primary |
| AI SDK | `@google/genai` pinned `^2 <3` | current GA SDK; structured output via `responseJsonSchema` | legacy `@google/generative-ai` | deprecated | 3.x breaking changes must be adopted deliberately | announced deprecations land |
| Extraction | `unpdf` | pdf.js build that works serverless, per-page text, pure JS | poppler/native | native deps are an RCE/ops surface | pdf.js fidelity limits (documented) | extraction quality regresses on target corpus |
| Validation | Zod v4 everywhere | one schema language across API/AI/env | io-ts, Valibot | smaller ecosystems | bundle size | n/a |
| Tests | Vitest + Playwright | fast unit loop; real-browser E2E | Jest | slower TS setup | two runners to maintain | n/a |
| Rate limiting | Postgres fixed-window table | zero new infra for MVP | Redis | another service to run | row churn on hot windows | >1k rps sustained or multi-region |

See [decisions.md](./decisions.md) for the full ADR list including the
deviations from the original blueprint.
