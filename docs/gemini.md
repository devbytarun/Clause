# Gemini integration

Single owning module: `src/lib/gemini/gateway.ts`. Everything Gemini —
SDK usage, model IDs, generation params, retries, streaming, usage
accounting — lives there and nowhere else.

## Models and configuration

| Setting | Default | Env override |
|---|---|---|
| Analysis model | `gemini-2.5-flash` | `GEMINI_ANALYSIS_MODEL` |
| Chat model | `gemini-2.5-flash` | `GEMINI_CHAT_MODEL` |
| Analysis thinking budget | 2048 tokens | `GEMINI_ANALYSIS_THINKING_BUDGET` |
| Chat thinking budget | 0 (latency-first) | `GEMINI_CHAT_THINKING_BUDGET` |
| Temperature | 0.2 (fixed) | — |
| Max output | 8192 analysis / 4096 chat | — |

Escalation path: flip `GEMINI_ANALYSIS_MODEL` to `gemini-2.5-pro` via env
if evals show extraction misses — no code change.

## Structured output

Analysis uses `responseMimeType: application/json` +
`responseJsonSchema` (JSON-schema subset mirroring
`src/lib/schemas/analysis.ts`). The Zod schema remains authoritative:
app-side validation runs on every response regardless of constrained
decoding, followed by **one** repair retry whose prompt embeds the
validator errors; persistent invalidity fails as `analysis_invalid`.

## Error taxonomy (mapped to blueprint §19)

| Condition | Code | Retryable |
|---|---|---|
| 429 after backoff ×3 | `rate_limited` | yes |
| 5xx / network before first token | retried ×3 exponential → `provider_error` | yes |
| Empty response | `provider_error` | yes |
| Safety/prohibited block | `blocked` | no |
| Unparseable / schema-invalid after repair | `analysis_invalid` | manual retry |
| Missing API key / storage config | original error passes through unmapped (`missing_api_key`) | config fix |

## Streaming (chat)

`generateContentStream` powers SSE answers. Retries apply only before
the first delta; once tokens have reached the client, failures surface
immediately rather than silently restarting (which would duplicate
visible text). Usage is read from the final chunk's `usageMetadata`.

## Transport injection

Both `generate` and `streamChat` are part of an injectable transport
interface — unit/contract tests run against scripted responses with zero
network access; live behavior is exercised by `pnpm eval:run`.
