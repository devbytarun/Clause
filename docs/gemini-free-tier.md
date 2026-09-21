# Gemini free-tier operation

The project runs on the **free Gemini API tier** (operator decision
D-002). This document states the constraints as they exist today, what
the app does to stay inside them, and exactly what a user sees when a
limit is hit.

> Free-tier quotas are **volatile** — Google materially cut them in
> Dec 2025 and publishes stable numbers only in the AI Studio console.
> Treat any figure here as an approximation and verify against
> aistudio.google.com → model → "Rate limits" for your key/region.

## Constraints (free tier)

| Constraint | Reality | Where it bites |
|---|---|---|
| Data use | Content submitted on the free tier **may be used by Google to improve products** | disclosed at upload consent + sign-in + `/privacy` |
| RPM / TPM / RPD per model | per-key, per-model; varies by region/account; Flash-class models have the highest free allowances | bursts of uploads or chat |
| Daily request budget (RPD) | resets midnight Pacific; exhausted ⇒ hard 429 until reset | heavy single days |
| Output tokens count toward budgets | thinking tokens too | long analyses |

## What the implementation does to stay efficient

1. **One Gemini call per document** — no overview/findings split, no
   speculative calls. Re-analysis exists only as an explicit retry of a
   failed pipeline.
2. **Full-text chat, zero retrieval calls** — one request per user
   message; no embeddings, no vector queries (D-004).
3. **Tight history window** — last 10 messages AND ≤4k estimated tokens,
   oldest-first trim (`HISTORY_MAX_MESSAGES` / `HISTORY_CAP_TOKENS`).
4. **Chat thinking disabled** (`GEMINI_CHAT_THINKING_BUDGET=0`) and
   answers hard-capped at 1536 output tokens — grounded answers are
   short; runaway generation cannot drain the budget.
5. **Analysis thinking 2048** — the one place quality justifies spend;
   configurable via env.
6. **Duplicate upload detection** — identical re-uploads are rejected
   before consuming any AI quota (proceed only on explicit confirm).
7. **App-level daily budget** — `GEMINI_DAILY_REQUEST_LIMIT` (default
   **400/day**, adjustable) counts *every* Gemini call — analysis and
   chat share one counter in `rate_limit_windows`. Set it near your
   model's real RPD so the app degrades gracefully instead of feeding
   Google 429s all day.

## What happens when limits are hit

| Situation | Behavior | User sees |
|---|---|---|
| App daily budget exhausted | analysis → document `failed` with code `ai_capacity`; chat turn rejected **before** the question is persisted | "The AI service has reached today's usage capacity. Please try again tomorrow." Failed docs keep their file; Retry works next day. |
| Google returns 429 (RPM/RPD) despite our guards | gateway backs off ×3 exponentially, then maps to `rate_limited` | "Too many requests…" / failed-doc retry path |
| 5xx / network before first token | same backoff, then `provider_error` | temporary-unavailable copy |
| Safety block | immediate, non-retryable `blocked` | neutral declined copy |
| Mid-stream failure during chat | error surfaced immediately (no silent duplicate-answer retry); already-persisted user message stays, history intact | inline error bubble with input preserved for resend |

## Tuning knobs (env)

```
GEMINI_DAILY_REQUEST_LIMIT=400      # shared daily cap
GEMINI_ANALYSIS_THINKING_BUDGET=    # default 2048
GEMINI_CHAT_THINKING_BUDGET=        # default 0
GEMINI_ANALYSIS_MODEL=gemini-3.6-flash
GEMINI_CHAT_MODEL=gemini-3.6-flash
RATE_LIMIT_UPLOADS_PER_HOUR=10
RATE_LIMIT_CHAT_PER_MINUTE=12
```

If free-tier RPD proves too tight for real traffic, the documented
upgrade is paid Tier 1 — an env/billing change, not a code change
(see [roadmap.md](./roadmap.md)).
