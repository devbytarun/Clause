# API reference

All routes are user-scoped server-side. Mutating routes require a
same-origin `Origin` header. JSON errors use
`{ "error": { "code", "message" } }` from the fixed code table.

| Method & path | Input | Output | Errors |
|---|---|---|---|
| GET `/api/auth/callback` | Supabase code | redirect to dashboard/login?error=auth | auth failure → login |
| POST `/api/auth/signout` | – | redirect `/` | – |
| POST `/api/documents` | multipart `file` (PDF) | `201 {id, status:'queued'}` · `409 {duplicateOf}` (confirm via `?confirm=1`) | 401 · 413 too large · 415 bad type/empty · 429 quota |
| GET `/api/documents?q=&cursor=` | query | `{items[], nextCursor\|null}` (cursor = ISO timestamp) | 401 |
| GET `/api/documents/:id` | – | detail incl. status, errorCode, pageCount, isScanned | 401 · 404 |
| DELETE `/api/documents/:id` | – | `{ok:true}` → background purge | 401 · 404 |
| POST `/api/documents/:id/retry` | – | `{status:'queued'}` | 401 · 404 · 409 not failed · 429 attempts/limit |
| GET `/api/documents/:id/analysis` | – | `{modelId, result(+verifications), tokens}` | 401 · 404 · 409 until ready |
| GET `/api/documents/:id/pages?page=n` | page number | `{pageNumber, text}` | 400 · 401 · 404 · 409 pre-ready · 416 bad page |
| GET `/api/documents/:id/pages/search?q=` | text query | `{hits:[{pageNumber, snippet}]}` | 401 · 404 |
| GET `/api/documents/:id/file` | – | `{url}` signed ≤15 min | 401 · 404 · 429 · 503 storage |
| GET `/api/conversations/by-document/:documentId/messages?before=` | cursor | `{messages[], nextBeforeId}` (empty until first chat) | 401 |
| POST `/api/conversations/by-document/:documentId/messages` | `{content}` ≤2000 chars | SSE: `delta {t}` … `done {messageId, sources}` \| `error {code}` | 400 · 401 · 429 (+Retry-After) |
| GET `/api/cron/cleanup` | Bearer CRON_SECRET | purge/prune report | 401 |

Notes:
- `POST messages` streams `text/event-stream`; the server completes and
  persists even if the client disconnects (Stop only stops rendering).
- Chat history returns an empty list rather than creating a conversation;
  conversations are created lazily on first message.
- Processing kicks via `after()`; clients poll `GET /api/documents/:id`.
