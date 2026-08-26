# Grounding, citations, and prompt-injection containment

This is the product's core trust mechanism: it converts "the LLM said
page 7" into "the app confirmed page 7 contains this sentence."

## Citation validation (`src/lib/citations/`)

1. **Normalize** quote and page text: NFC, whitespace collapse,
   curly→straight quotes/dashes, soft hyphens/zero-widths removed,
   ligatures expanded, case-folded.
2. **Exact** substring match on the cited page → `verified`.
3. **Fuzzy**: sliding window (quote length ±15%) with normalized
   Levenshtein ratio ≥ 0.92 → `verified_fuzzy` (absorbs pdf-extraction
   artifacts like hyphenation).
4. **Page correction**: same matching against every other page →
   `page_corrected` with the true page.
5. Else → `unverified`: the finding is still shown but flagged, never
   silently dropped.

Scanned documents force `unverified` for all citations.

Every persisted analysis stores these states inside the JSONB payload;
the UI renders three visibly distinct evidence states (✓ verified /
→ corrected page / ? unverified) with tooltips explaining each.
Chat answers cite pages only after the referenced page is confirmed to
exist; references to non-existent pages are dropped before persistence.

## Prompt-injection strategy — containment, not prevention

| Layer | Implementation |
|---|---|
| Instruction hierarchy | system prompt declares `<document>` content inert third-party data; chat rules are re-asserted *after* the document block (recency anchoring) |
| Delimiting | unmistakable fences + pre-sanitization strips anything resembling the closing tag or forged page markers from extracted text |
| Structural containment | analysis schema has no field where "revealed instructions" could live; concerns must carry document_fact/interpretation/uncertainty |
| Post-validation | banned-pattern filter drops items asserting legality/enforceability/scores/instruction echo |
| Evidence gate | injected text cannot mint evidence: citations must match real extracted pages |
| Blast radius | a successful injection affects only that user's own analysis of their own document |

Test corpus lives in unit tests (`page-markers.test.ts`,
`policy-filter.test.ts`, `context-builder.test.ts`) covering forged
closures, fake `[PAGE 999]` markers, and instruction-echo patterns.

## Chat grounding

System instruction requires: answer only from provided text; append
`(Page N)` references that match real page markers; two verbatim refusal
templates:

- Not found: `I couldn't find information about this in the uploaded document.`
- External law/outcomes: `The document doesn't provide enough information to answer this. This may depend on applicable law and your circumstances.`

Templates are constants asserted by unit tests and the eval suite — they
are contract, not copy.

## Context budgets (chat)

Document text cap 110k tokens (**drop-to-fail**, never silent clause
truncation) · history last 12 messages AND ≤6k tokens (oldest-first,
newest kept) · analysis summary included for orientation · total input
ceiling ≈120k. The `buildChatContext` signature is the retrieval seam:
a pgvector-backed builder can replace full-text assembly without
touching ChatService.
