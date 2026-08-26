# Testing & AI evaluation

## Layers

| Suite | Scope | Runs |
|---|---|---|
| Unit (Vitest) | env validator, error-code map, withAuth (mocked session), citation normalize/validator, page-marker sanitization, policy filter, analysis schemas, context-builder budgets, chat prompts/refusal templates, document-processor incl. generated real PDFs, gateway contract (scripted transports: repair retry, transient backoff, 429 exhaustion, safety block) | every commit, no infra |
| Integration (Vitest) | migration round-trip on clean Postgres; pipeline service end-to-end with in-memory storage + scripted Gemini (happy path w/ verified citations persisted in JSONB, idempotent double-trigger, corrupt-bytes failure keeps object, gateway failure mapping, cross-user ownership matrix) | CI Postgres service / local `TEST_DATABASE_URL` |
| E2E (Playwright) | citation-jump journey: real Supabase magic-link sign-in → seeded ready doc → verified badge → viewer targets `#page=2`; unverified-state assertions | requires live Supabase + app (`pnpm e2e`) |
| Eval harness | `pnpm eval:run` — fixtures vs gold spec (below) | nightly/manual with API key |

## Fixtures

`fixtures/*.pdf` are deterministic, dependency-free generated text PDFs
(offer letter, NDA, sparse draft). `fixtures/gold.json` is a
human-authored gold file: expected facts per fixture (must-contain),
deliberately absent clauses (non-compete, payment terms…), and chat
probes asserting the two refusal templates **verbatim**.

## Measured metrics (no vanity percentages)

- Schema pass rate; repair-retry frequency (gate <2% failures)
- Fact extraction per-fixture checklist: hits / misses / hallucinated
  findings — any hallucinated finding is a release blocker
- Citation verification distribution: % verified / fuzzy /
  page-corrected / rejected, tracked per model+prompt version
- Injection corpus pass (any leak = blocker)
- Chat rubric probes: grounded / hedged-correctly / fabricated

Run: `GOOGLE_GENERATIVE_AI_API_KEY=… pnpm eval:run`

## What is NOT tested automatically (yet)

- Live-model evals run only when a key is configured (CI runs the
  recorded-transport suites).
- Playwright suite requires configured Supabase + running server.
