# Architecture Decision Records

Every entry: what we chose · why · alternatives considered · why
rejected · trade-off accepted · reconsider-trigger.

## D-001 — Local workspace replaces hosted authentication (2026-09-22)

- **What:** one fixed local workspace identity backed by the application
  database; no login or hosted identity provider.
- **Why:** the MVP is designed for one private machine and needs no account
  onboarding or third-party identity surface.
- **Alternatives:** Supabase Auth or Auth.js — unnecessary complexity until
  sharing or multi-user hosting is required.
- **Trade-offs:** access to the machine is the security boundary; it is not a
  multi-user hosted product.
- **Reconsider:** sharing, collaboration, or hosted accounts are added.

## D-002 — All-free-tier launch posture (2026-08-26)

- **What:** launch entirely on free tiers; paid Gemini Tier 1 deferred
  until real sensitive traffic.
- **Why:** operator decision to validate the product before spend.
- **Alternatives:** blueprint's original paid-tier-before-users gate.
- **Trade-offs:** free-tier content may train Google products →
  disclosed in upload consent + login copy; volatile free quotas
  mitigated by in-app per-user limits.
- **Reconsider:** before soliciting sensitive real-user documents
  (privacy), or on sustained 429 pressure (quotas).

## D-003 — Native PDF viewer instead of react-pdf/pdf.js (2026-08-26)

- **What:** browser-native PDF rendering over signed URLs with
  `#page=N` fragment jumps; text search stays on `document_pages`.
- **Why:** pdf.js worker bundling under Next 16/Turbopack was the
  riskiest dependency of Phase 5; native viewer gives programmatic
  jumps with zero dependencies.
- **Alternatives:** react-pdf (blueprint) — rejected on bundling/worker
  risk for this codebase; pdfjs-dist direct — same risks.
- **Trade-offs:** no in-document highlight painting; viewer chrome is
  browser-controlled.
- **Reconsider:** highlight rendering becomes a hard requirement.

## D-004 — Full-text chat context over RAG (per original blueprint, kept)

- **What:** every chat turn includes the whole sanitized document
  (≤110k-token drop-to-fail cap) plus budgeted history.
- **Why:** target documents fit comfortably; retrieval adds miss-driven
  hallucination risk for marginal savings at this scale.
- **Alternatives:** pgvector retrieval over `document_pages`.
- **Trade-offs:** per-message input tokens scale with doc size.
- **Reconsider:** typical documents >~50 pages, or cost becomes
  material — `buildChatContext` is the seam.

## D-005 — Postgres fixed-window rate limiting (2026-08-26)

- **What:** `rate_limit_windows` table + upsert-increment limiter.
- **Why:** zero new infra; auditable; portable across hosts.
- **Alternatives:** Redis, Vercel KV, in-memory.
- **Trade-offs:** row churn on hot keys; single-region counter.
- **Reconsider:** sustained high RPS or multi-region.

## D-006 — Local filesystem storage adapter (2026-09-22)

- **What:** filesystem adapter for upload/download/remove/sign.
- **Why:** document bytes stay on the machine running Clause and the adapter
  is small and trivially mockable.
- **Alternatives:** S3, Supabase Storage, or Vercel Blob.
- **Trade-offs:** the host needs persistent disk and a manual backup policy.
- **Reconsider:** multi-user hosted deployment or object lifecycle tooling.

## Historical note

The project originally implemented Auth.js v5 end-to-end (Phase 1). The
working swap commit and the dropped-tables migration (`0001`) preserve
that history honestly rather than rewriting it.
