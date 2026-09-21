import { z } from "zod";
import {
  VERIFICATION_STATES,
  HighlightSchema,
  PositivePointSchema,
  QuestionToAskSchema,
  ConcernSchema,
  OverviewSchema,
  OmissionSchema,
} from "@/lib/schemas/analysis";

/**
 * Analysis payload as persisted post-citation-validation:
 * every source carries its machine-verified state.
 */
export const VerifiedSourceSchema = z.object({
  page: z.number().int().min(1),
  section: z.string().optional(),
  quote: z.string().min(1),
  verification: z.enum(VERIFICATION_STATES),
  correctedPage: z.number().int().min(1).optional(),
});

export type VerifiedSource = z.infer<typeof VerifiedSourceSchema>;

export const WorkspaceAnalysisSchema = z.object({
  overview: OverviewSchema,
  highlights: z.array(
    HighlightSchema.omit({ source: true }).extend({ source: VerifiedSourceSchema })
  ),
  positive_points: z.array(
    PositivePointSchema.omit({ source: true }).extend({ source: VerifiedSourceSchema })
  ),
  concerns: z.array(
    ConcernSchema.omit({ source: true }).extend({ source: VerifiedSourceSchema })
  ),
  omissions: z.array(OmissionSchema).default([]),
  questions_to_ask: z.array(QuestionToAskSchema),
});

export type WorkspaceAnalysis = z.infer<typeof WorkspaceAnalysisSchema>;
