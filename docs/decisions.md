# Decision Log

Recorded deviations from the original blueprint, with rationale.

## D-001 — Supabase Auth replaces Auth.js v5 (2026-08-26)

Operator decision: minimize setup burden and cost at launch. Identity is
owned by Supabase Auth (free tier, hosted magic links + OAuth toggles).
Consequences kept intact:

- `users.id` mirrors `auth.users.id`; every ownership FK unchanged.
- `getSessionUser()` API surface identical → `withAuth` wrapper,
  repositories, and all routes required zero changes.
- Legacy Auth.js tables (accounts/sessions/verification_tokens) dropped
  in migration 0001.
- Login provider visibility driven by env flags
  (`NEXT_PUBLIC_ENABLE_GOOGLE_SIGNIN`); enabling a provider is a
  Supabase-dashboard toggle, not a code change.

## D-002 — All-free-tier launch posture (2026-08-26)

Operator decision: launch on free tiers (Gemini free, Neon free, Supabase
free, Vercel Hobby). Accepted trade-offs, disclosed honestly in-product:

- Gemini free tier content **may be used to improve Google products** —
  disclosed in the upload consent copy and login panel. Upgrade to paid
  Tier 1 before soliciting sensitive real-user documents.
- Free-tier rate limits are volatile; per-user limits in app are the
  first line of defense; upgrade path is env/billing only.
- Backup-retention figure on the privacy page must be set to the actual
  Neon plan value before public launch.

## D-003 — Native PDF viewer instead of react-pdf (Phase 5)

pdf.js worker bundling under Next 16/Turbopack was identified as the
riskiest dependency in the viewer phase. The browser-native PDF renderer
driven by signed URLs + `#page=N` fragments provides programmatic page
jumps with zero new dependencies; text search intentionally lives on the
`document_pages` index (as the blueprint already specified), not the PDF
text layer. Revisit only if in-PDF highlight rendering becomes a hard
product requirement.
