import { z } from "zod";

/**
 * Structured analysis output contract (blueprint §9).
 * Mirrored as a JSON-schema subset for Gemini responseSchema in
 * src/lib/prompts/analysis.ts — keep both in sync.
 *
 * Every field is nullable/omittable so absence is representable,
 * never guessed. No field exists for legality, enforceability, or
 * outcome judgments — the model has nowhere to put them.
 */

export const PRIORITY_LEVELS = ["low", "moderate", "high"] as const;

export const SourceSchema = z.object({
  page: z.number().int().min(1),
  section: z.string().optional(),
  quote: z.string().min(1),
});

export const PartySchema = z.object({
  role: z.string(),
  name: z.string(),
});

export const DateEntrySchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const OverviewSchema = z.object({
  document_type: z.string().nullish(),
  parties: z.array(PartySchema).default([]),
  dates: z.array(DateEntrySchema).default([]),
  compensation: z.string().nullish(),
  duration: z.string().nullish(),
  notice_period: z.string().nullish(),
  probation: z.string().nullish(),
  location: z.string().nullish(),
  hours: z.string().nullish(),
  benefits: z.array(z.string()).default([]),
  deadlines: z.array(DateEntrySchema).default([]),
});

const CitedItemBase = {
  title: z.string().min(1),
  explanation: z.string().min(1),
  source: SourceSchema,
};

export const HighlightSchema = z.object(CitedItemBase);

export const PositivePointSchema = z.object(CitedItemBase);

export const ConcernSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(PRIORITY_LEVELS),
  document_fact: z.string().min(1),
  interpretation: z.string().min(1),
  uncertainty: z.string().min(1),
  plain_english: z.string().min(1),
  source: SourceSchema,
});

export const QuestionToAskSchema = z.object({
  question: z.string().min(1),
  rationale: z.string().min(1),
  related_concern_title: z.string().optional(),
  source: SourceSchema.optional(),
});

export const AnalysisResultSchema = z.object({
  overview: OverviewSchema,
  highlights: z.array(HighlightSchema).default([]),
  positive_points: z.array(PositivePointSchema).default([]),
  concerns: z.array(ConcernSchema).default([]),
  questions_to_ask: z.array(QuestionToAskSchema).default([]),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Concern = z.infer<typeof ConcernSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
export type PositivePoint = z.infer<typeof PositivePointSchema>;
export type QuestionToAsk = z.infer<typeof QuestionToAskSchema>;

/** Verification states attached by CitationValidator before persistence. */
export const VERIFICATION_STATES = [
  "verified",
  "verified_fuzzy",
  "page_corrected",
  "unverified",
] as const;

export type VerificationState = (typeof VERIFICATION_STATES)[number];

export interface VerifiedSource extends Source {
  verification: VerificationState;
  /** Present when the citation was found on a different page than cited. */
  correctedPage?: number;
}
