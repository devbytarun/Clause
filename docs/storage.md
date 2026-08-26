# Storage

Supabase Storage, single **private** bucket (`STORAGE_BUCKET`, default
`docs-prod`). No public access, no CDN.

## Object addressing

`{userId}/{uuid}.pdf` — original filenames never appear in object paths
(header-injection/encoding safety); they live only in the database.

## Access paths

| Operation | Mechanism |
|---|---|
| Upload | streamed through the server route (never client→bucket); size+magic-byte gates run first |
| Read | server issues a signed URL, TTL = `SIGNED_URL_TTL_SECONDS` (default 900s), only after ownership check; viewer refreshes URLs before expiry |
| Delete | nightly cron removes the object **then** hard-deletes rows |

## Adapter

`src/lib/storage/types.ts` implements the Supabase Storage REST API with
plain `fetch` — no vendor SDK dependency, trivially injectable in tests
(`memoryStorage()` double). Errors map to stable codes
(`storage_unavailable` → HTTP 503).

| Alternative | Why rejected | Trade-off | Reconsider when |
|---|---|---|---|
| S3 + IAM | more setup than one Supabase project for this scale | provider lock-in (already chosen for auth) | multi-cloud requirement |
| Vercel Blob | fine, but signed-URL management and bucket hygiene split across vendors | n/a | already on Vercel-native everything |
| Direct client→bucket uploads (signed PUT) | would expose write scopes and bypass validation | upload latency through server | files >20 MB or high upload concurrency |

## Guarantees and limits

- Objects are deleted immediately and unrecoverable (versioning off) —
  matches the privacy posture.
- The MVP adapter has no LIST call: storage-side orphan sweep
  (object-without-row) is not automated; documented in
  [limitations.md](./limitations.md). Row-without-object cannot occur.
