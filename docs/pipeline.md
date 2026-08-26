# Document-processing pipeline

`POST /api/documents` (multipart) → background pipeline. Steps mirror
blueprint §8 as implemented:

```
1  AuthN/AuthZ ........ withAuth + upload rate limit (10/h per user)
2  Size/type gate ..... ≤20 MB; declared MIME ∈ {application/pdf}
3  Magic bytes ........ first bytes === %PDF- (fake-MIME rejection)
4  Hash/dedupe ........ sha256; same user+hash → 409 with existing id,
                        proceed only on explicit confirm (?confirm=1)
5  Storage write ...... {userId}/{uuid}.pdf, private bucket
6  DB row ............. status='queued'; after() kicks the pipeline
7  Claim .............. conditional UPDATE queued→extracting
                        (idempotency: double-trigger is a no-op)
8  Parse/extract ...... unpdf per-page text
                        encrypted → pdf_encrypted · corrupt → pdf_corrupt
9  Page persist ....... document_pages rows; page_count set;
                        >120 pages → too_many_pages
10 Liveness ........... total chars <200 ⇒ is_scanned=true
11 Analysis ........... GeminiGateway.analyzeDocument (text mode; scanned
                        docs still analyzed from inline text if any)
12 Schema validation .. Zod parse; one repair retry w/ error list appended;
                        then analysis_invalid
13 Policy filter ...... banned-pattern items stripped (legal verdicts,
                        numeric scores, privacy claims, instruction echo)
14 Citation validation every source checked against page text (§10)
15 Persist ............ analyses row (status=complete) + extractive
                        summary; documents.status='ready'
Failure at 8–14 ....... status='failed', stable error_code, storage object
                        KEPT so the user can retry or delete
```

Retry: `POST /api/documents/:id/retry` resets failed→queued (≤3 attempts
per doc, ≤3/hour limiter) and re-kicks via `after()`.

## Scanned PDFs

No local OCR is attempted or claimed. When extraction yields <200 chars
the document is flagged `is_scanned`; citations are forced to
`unverified`, and a persistent banner states references are
"AI-identified, not independently verified."

## Why this shape

| Decision | Rationale |
|---|---|
| Page boundaries come from the PDF structure, never the model | pagination is deterministic; the model only cites pages that exist |
| One Gemini call per document | splitting into overview/findings calls doubles failure modes for marginal gain (revisit trigger: eval regressions) |
| Pipeline independent of HTTP request | user can close the tab; polling resumes later |
| Storage object kept on failure | honest retry instead of silent data loss |

Full prompt/schema/citation details:
[grounding-and-citations.md](./grounding-and-citations.md).
