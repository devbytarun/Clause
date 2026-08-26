# Known limitations & trade-offs

Stated plainly, as built.

## Product-level

- **Not legal advice, ever.** The schema and copy structurally exclude
  legality/enforceability/outcome claims; still, AI interpretations can
  be wrong — the fact/interpretation/uncertainty triad exists to keep
  that visible.
- **Scanned-PDF citations are unverifiable by construction.** No OCR is
  claimed or performed; such citations are labeled "AI-identified, not
  independently verified" everywhere they render.
- **English-language documents only.**
- **Free-tier Gemini at launch (D-002):** content may be used by Google
  for product improvement; disclosed in consent + login copy. Daily
  request budget (default 400/day shared across analysis + chat) and
  per-user limits keep traffic inside free quotas — behavior when
  limits hit is documented in
  [gemini-free-tier.md](./gemini-free-tier.md).
- Dashboard lists the most recent page of documents; API supports full
  cursor pagination (`nextCursor`) but no infinite-scroll UI yet.

## Engineering

- Token budgets use a chars/4 estimate — conservative, dependency-free;
  not a tokenizer.
- Chat citation sources validate **page existence**, not verbatim quotes;
  quote-level validation remains exclusive to the structured analysis.
- SSE chat does not cancel server generation when the client aborts
  (Stop stops rendering; the completed answer is persisted) — deliberate,
  keeps history truthful.
- `after()` pipeline on serverless has platform execution limits;
  very large queues need a durable worker (roadmap).
- No strict CSP yet (needs nonce infrastructure); compensating headers
  shipped (nosniff, frame-deny, referrer policy).
- Storage adapter lacks LIST: object-without-row orphans aren't swept
  automatically. Row-without-object cannot occur (delete order).
- Playwright E2E requires configured Supabase + running app; CI runs
  unit + integration suites only.
- Live-model evals need an API key; recorded-transport contract tests
  gate logic in CI.
- Upload quota counts attempts (including rejected/duplicate attempts)
  toward the hourly limit — acceptable abuse-guard trade-off.

## Deliberate non-goals (permanent)

- Numeric risk scores: excluded from schema, prompts, policy filter,
  and UI copy by design.
- Jurisdiction-specific analysis: would require legal sources we don't
  have and license we can't claim.
