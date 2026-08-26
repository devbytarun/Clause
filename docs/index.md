# Clause — Documentation

Clause is an AI-assisted document reader for offers, NDAs, and agreements.
It extracts page-level text from PDFs, runs a single structured Gemini
analysis, **machine-validates every AI citation against the extracted page
text before display**, and provides a document-grounded chat that refuses
to answer beyond the document.

**Not legal advice.** Analysis is informational only and never determines
legality, validity, or enforceability.

## Documentation map

| Document | Contents |
|---|---|
| [product.md](./product.md) | Product overview, user flow, MVP scope |
| [architecture.md](./architecture.md) | System architecture and stack rationale |
| [database.md](./database.md) | Schema decisions and data lifecycle |
| [authentication.md](./authentication.md) | Supabase Auth integration (D-001) |
| [storage.md](./storage.md) | Private bucket, signed URLs, deletion |
| [pipeline.md](./pipeline.md) | Upload → extraction → analysis → validation |
| [gemini.md](./gemini.md) | Gateway, models, structured output, streaming |
| [grounding-and-citations.md](./grounding-and-citations.md) | Citation validator, prompt-injection containment, chat grounding |
| [security.md](./security.md) | AuthZ model, rate limits, headers, secrets |
| [privacy.md](./privacy.md) | Data flow disclosure, free-tier posture, deletion |
| [error-handling.md](./error-handling.md) | Error taxonomy and user-facing states |
| [testing.md](./testing.md) | Test strategy + AI evaluation harness |
| [api.md](./api.md) | Endpoint reference |
| [deployment.md](./deployment.md) | Setup, environment variables, deploy runbook |
| [roadmap.md](./roadmap.md) | Deferred features and triggers to build them |
| [decisions.md](./decisions.md) | Architecture decision records (ADRs) |
| [limitations.md](./limitations.md) | Known limitations and trade-offs |

The documentation describes the system as actually implemented — including
deviations from the original blueprint recorded in `decisions.md`.
