# Database

Neon Postgres, accessed only through Drizzle with parameterized queries.

## Schema (migration history: `src/db/migrations/`)

```
users              id uuid PK  (= fixed local workspace id)
                   email citext, name, image, created_at

documents          id uuid PK · user_id FK→users CASCADE
                   original_filename · mime_type CHECK ='application/pdf'
                   size_bytes CHECK 0<…≤20MB · sha256 char(64) CHECK len=64
                   storage_path UNIQUE ({userId}/{uuid}.pdf)
                   status CHECK queued|extracting|analyzing|ready|failed
                   error_code · page_count · char_count · is_scanned
                   attempts · processing_started_at · deleted_at · timestamps
                   IDX (user_id, created_at DESC) · (user_id, sha256)
                       (status) WHERE status != 'ready'

document_pages     id bigserial · document_id FK CASCADE
                   page_number CHECK ≥1 · text
                   UNIQUE(document_id, page_number)

analyses           id uuid PK · document_id UNIQUE FK CASCADE
                   model_id · status CHECK pending|complete|failed
                   result jsonb  (Zod-validated AnalysisResult incl. citation
                                  verification states)
                   input_tokens · output_tokens · summary_text · created_at

conversations      id uuid PK · document_id UNIQUE FK CASCADE
                   user_id FK users (denormalized for cheap ownership checks)

messages           id bigserial · conversation_id FK CASCADE
                   role CHECK user|assistant · content
                   sources jsonb [{page, verification}] (assistant only)
                   input/output tokens · created_at
                   IDX (conversation_id, created_at)

rate_limit_windows key text · window_start timestamptz · count int ≥0
                   PK(key, window_start)
```

Auth.js and hosted-auth tables from the original prototype were removed. The
MVP uses one fixed local workspace identity and does not expose a login flow.

## Decisions and why

| Decision | Rationale | Trade-off | Reconsider when |
|---|---|---|---|
| `users.id` mirrors Supabase UID | keeps every FK chain and ownership query identical after the auth swap | coupling to Supabase identifiers | migrating off Supabase Auth (write a mapping table then) |
| `citext` email uniqueness | case-insensitive uniqueness at the DB level | requires `CREATE EXTENSION citext` (statement lives in migration `0000`) | never — portable across Neon |
| Page text as rows (`document_pages`) | ground truth for citation validation + indexed search | many rows per doc | n/a |
| Analysis JSONB gated by Zod | flexible payload evolution; invalid payloads cannot be stored (validated before insert) | no relational queries into findings | cross-document analytics demand it |
| Seven-day retention + hard purge | bounded local retention with a clear privacy promise | old rows/files remain until the next sweep or access | compliance requires synchronous hard delete |
| No ON DELETE SET NULL anywhere | orphaned analysis/pages are treated as bugs, not features | deletes are all-or-nothing cascades | n/a |

## Data lifecycle

Upload → row `queued` → conditional claim `extracting` (idempotency guard:
double-triggered pipeline runs are no-ops) → `analyzing` → `ready`, any
failure → `failed` + stable `error_code` (storage object kept for retry).
Retention or delete → storage object is removed first → document row is
hard-deleted (cascade wipes pages/analysis/conversation/messages).
