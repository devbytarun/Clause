# Privacy & data flow

Honest disclosure as implemented (mirrors the in-app `/privacy` page).

## Data flow

> Your document is uploaded to the machine running Clause, stored in its
> `.storage/` directory, processed for text extraction, and sent to Google's
> Gemini API for analysis. Results are stored in the configured PostgreSQL
> database. It is a local-storage MVP, but it is not a zero-cloud tool because
> Gemini receives document text and grounded chat context.

| Question | Answer (as built) |
|---|---|
| Collected at upload | the PDF bytes + filename |
| Stored durably | PDF in `.storage/`, filename, size/hash/mime, extracted per-page text, analysis JSONB, chat messages + page-badge sources, and one local workspace profile |
| Sent to Gemini | full extracted document text with page markers; system instructions; chat history window + question. Nothing else; no cross-user mixing |
| Logs | event metadata only: IDs, sizes, durations, error codes, token counts. Never document text, filenames, prompts, or messages |
| Retention | seven days from upload, or until manual deletion |
| Deletion | retention sweep removes the storage object then hard-deletes rows (cascade); local access also triggers a sweep when no scheduler is available |
| Backups | provider-managed backups may retain deleted rows for a plan-dependent window — disclosed on /privacy with an explicit "verify before relying on a figure" note |
| Scanned PDFs | citations cannot be verified against a text layer; labeled "AI-identified, not independently verified" everywhere |

## Free-tier AI disclosure (D-002)

The service launches on Gemini's **free** API tier. On that tier, Google
may use submitted content to improve its products. This is disclosed in
two places: the upload consent checkbox copy and the sign-in panel. When
the operator moves to a paid tier, `/privacy` will be updated to state
that paid-tier content is not used for training.

## Positioning

Persistent one-line disclaimer above chat and in the workspace header:
analysis is informational, never legal advice, and never determines
legality/validity/enforceability. Banned positioning strings (legal
verdicts, numeric scores, privacy guarantees) are filtered from AI
output and audited in UI copy.
