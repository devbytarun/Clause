# Architecture

```
Browser (Next.js React, server components + client islands)
  │  session cookie (Supabase auth, httpOnly via @supabase/ssr)
  ▼
Next.js Route Handlers / Server Components (Node runtime)
  ├── withAuth wrapper ──── session → userId; origin check on mutations
  ├── DocumentsService ──── Supabase Storage REST (private bucket,
  │                          signed URLs ≤ 15 min)
  ├── DocumentProcessor ─── unpdf per-page text ──► document_pages
  ├── ChatService ─┐
  │   ContextBuilder├────► GeminiGateway (@google/genai, server-only,
  │   CitationValidator     env-pinned models, retries, usage accounting)
  └── RateLimiter ─► Postgres fixed-window table
                                   │ HTTPS
                                   ▼
                            Google Gemini API

Neon Postgres: users · documents · document_pages · analyses ·
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
| DB | Neon Postgres + Drizzle | serverless-friendly, branching, typed SQL without heavy ORM | Prisma | heavier runtime, weaker raw-SQL ergonomics here | Drizzle relation API is thinner than Prisma's | complex multi-level relations appear |
| Auth | **Supabase Auth** (D-001) | hosted magic links/OAuth free tier; zero credential setup for operator | Auth.js v5 (original blueprint) | required operator-side OAuth console/SMTP setup | identity lives outside app DB (mirrored by id) | need custom auth flows or self-hosting identity |
| Storage | Supabase Storage REST | same project as auth; signed URLs; hard-delete API | S3 direct, Vercel Blob | IAM setup; no SQL-adjacent management | REST adapter is hand-rolled (no official SDK) | object lifecycle policies or >5 GB objects needed |
| AI SDK | `@google/genai` pinned `^2 <3` | current GA SDK; structured output via `responseJsonSchema` | legacy `@google/generative-ai` | deprecated | 3.x breaking changes must be adopted deliberately | announced deprecations land |
| Extraction | `unpdf` | pdf.js build that works serverless, per-page text, pure JS | poppler/native | native deps are an RCE/ops surface | pdf.js fidelity limits (documented) | extraction quality regresses on target corpus |
| Validation | Zod v4 everywhere | one schema language across API/AI/env | io-ts, Valibot | smaller ecosystems | bundle size | n/a |
| Tests | Vitest + Playwright | fast unit loop; real-browser E2E | Jest | slower TS setup | two runners to maintain | n/a |
| Rate limiting | Postgres fixed-window table | zero new infra for MVP | Redis | another service to run | row churn on hot windows | >1k rps sustained or multi-region |

See [decisions.md](./decisions.md) for the full ADR list including the
deviations from the original blueprint.
