# Product

## What Clause does

1. A signed-in user uploads a PDF (≤ 20 MB, ≤ 120 pages).
2. The server validates the file structurally, extracts text per page,
   and persists both.
3. One structured Gemini call produces an analysis: overview, highlights,
   positive points, concerns (fact / interpretation / uncertainty), and
   questions worth asking.
4. Every citation in the output is checked against the extracted page
   text before anything is shown: exact match → fuzzy match → page
   correction → rejected ("unverified").
5. The user reads findings beside the PDF; clicking any citation opens
   the cited page.
6. The user can chat about the document. Answers are generated only from
   the extracted text, stream token-by-token, and carry page badges whose
   targets are validated the same way.

## User flow

```
Landing (/) ──► Sign in (/login | /signup)
                     │  Supabase magic link or Google OAuth
                     ▼
              Dashboard (/dashboard)
                consent checkbox (first upload only)
                upload PDF ──► POST /api/documents ──► queued
                     │ poll status (2s client refresh)
                     ▼
        Workspace (/documents/[id])
          left pane: PDF viewer (signed URL, #page jumps, search)
          right pane: Overview · Highlights · Concerns · Positives · Questions
                      grounded chat drawer below
                     │
             Delete ──► soft-hide instantly ──► nightly hard purge
```

## In scope (MVP)

Auth (Supabase), PDF-only upload with structural validation, page-level
extraction, one-call structured analysis, machine-validated citations,
PDF viewer with evidence deep-links, per-document grounded chat with
persistence, dashboard list/upload/retry/delete, privacy disclosures,
non-legal-advice positioning enforced at prompt level and copy level.

## Out of scope (MVP)

Legal validity claims, numeric risk scores (permanent exclusion),
jurisdiction-specific analysis, DOCX/images, multi-document comparison,
sharing/teams, RAG retrieval (seam exists; trigger conditions in
[roadmap.md](./roadmap.md)).
