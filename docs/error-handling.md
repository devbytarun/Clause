# Error handling

Pattern per failure: detect (typed) → map through the fixed code table →
preserve consistent document state (`failed` ≠ partially ready) → never
show partial output as complete. The analysis row flips atomically
pending→complete inside a transaction; UI reads `documents.status`, not
row presence.

## Stable error codes (`src/lib/error-codes.ts`)

| Code | User message (abbreviated) | Retryable |
|---|---|---|
| unauthorized | Sign in required | no |
| not_found | Does not exist or was deleted | no |
| file_too_large / file_bad_type / file_empty | size/type guidance | re-upload |
| pdf_encrypted | remove password protection | re-upload |
| pdf_corrupt | could not be read | re-upload |
| too_many_pages | exceeds 120-page limit | re-upload |
| analysis_invalid | valid result couldn't be produced; retry available | yes |
| rate_limited | wait and retry (429 carries Retry-After) | yes |
| provider_error | AI service temporarily unavailable | yes |
| blocked | AI declined this document | no |
| storage_unavailable | storage temporarily unavailable | yes |

Rules enforced by unit tests: every code maps to a non-empty,
detail-free message; internal terms (SQL, stack, keys) never appear.

## State matrix (UI)

Empty dashboard · uploading progress · queued/extracting/analyzing chips
with auto-refresh · ready workspace · failed card with human reason +
Retry (if attempts remain) + Delete · scanned banner · per-citation
verification states · honest empty sections ("No notable positive
provisions identified.") · chat loading/streaming/error-with-retry ·
404 indistinguishable from missing for foreign IDs · 429 cooldown toast
· viewer error pane with reload.
