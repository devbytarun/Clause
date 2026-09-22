# Storage

Local filesystem storage under `.storage/` by default. The directory should
live on a private, persistent machine or volume and should never be committed
to source control. There is no public bucket and no CDN.

## Object addressing

`{userId}/{uuid}.pdf` — original filenames never appear in object paths
(header-injection/encoding safety); they live only in the database.

## Access paths

| Operation | Mechanism |
|---|---|
| Upload | streamed through the server route (never client→filesystem); size+magic-byte gates run first |
| Read | server issues a signed URL, TTL = `SIGNED_URL_TTL_SECONDS` (default 900s), only after workspace checks; viewer refreshes URLs before expiry |
| Delete | seven-day retention sweep or manual deletion removes the object **then** hard-deletes rows |

## Adapter

`src/lib/storage/fs-adapter.ts` implements the filesystem adapter behind the
small `StorageAdapter` interface. It validates paths against traversal and is
trivially injectable in tests (`memoryStorage()` double). Errors map to stable
codes (`storage_unavailable` → HTTP 503).

| Alternative | Why rejected | Trade-off | Reconsider when |
|---|---|---|---|
| S3 + IAM | more setup than the local MVP requires | provider dependency and operational overhead | multi-user production hosting |
| Vercel Blob | adds a hosted file service and changes the privacy posture | provider dependency | hosted deployment becomes the primary target |
| Direct client→bucket uploads (signed PUT) | would expose write scopes and bypass validation | upload latency through server | files >20 MB or high upload concurrency |

## Guarantees and limits

- Objects are deleted without versioning after the seven-day retention window
  or manual deletion.
- The MVP adapter has no LIST call: storage-side orphan sweep
  (object-without-row) is not automated; documented in
  [limitations.md](./limitations.md). Row-without-object cannot occur.
