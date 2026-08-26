# Roadmap — deferred features and their triggers

Features intentionally out of the MVP, each with the condition that
should trigger building it:

| Feature | Trigger |
|---|---|
| DOCX/images support | extractor registry seam exists; build when user research shows >20% of rejected uploads are non-PDF |
| RAG retrieval over `document_pages` (pgvector) | real documents exceed the 110k-token chat cap, or per-question cost becomes material (>~50 pages typical) |
| Multiple conversations per document | users need parallel threads; schema already treats conversations as first-class |
| Account self-deletion UI | public launch with real accounts; SQL path = delete from users cascade + storage sweep |
| Redis-backed rate limiting | sustained write pressure on `rate_limit_windows` or multi-region deploys |
| Multi-document comparison | stable schemas proven across eval cycles; high demo appeal |
| In-PDF highlight rendering | native-viewer jumps prove insufficient for evidence UX (D-003) |
| Context caching warm-up on Gemini | chat volume makes repeated prefix cost visible |
| i18n / export / share | post-MVP product decisions |
| Durable job queue for pipeline | processing volume outgrows `after()` on serverless (visible as queued backlog) |
| Strict CSP with nonces | security hardening cycle after launch telemetry exists |
| Storage-side orphan sweeper | adapter gains LIST capability or provider-side lifecycle rules cover it |

## Launch checklist owned by the operator

- Verify the key's real RPM/RPD in AI Studio and set
  `GEMINI_DAILY_REQUEST_LIMIT` to match (default 400).
- Paid Tier 1 only if/when the project needs it: trigger = sustained
  daily-budget exhaustion (`ai_capacity` failures) or a privacy
  requirement that submitted documents never train Google products.
- Restricted Gemini API key; rotation cadence on a calendar.
- Sentry DSN wired if incident visibility is wanted.
