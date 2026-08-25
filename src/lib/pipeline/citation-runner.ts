import {
  validateSource,
  summarizeVerifications,
  type CitationStats,
} from "@/lib/citations/validator";
import type { AnalysisResult, VerifiedSource } from "@/lib/schemas/analysis";

interface SourceLike {
  page: number;
  quote: string;
  section?: string;
}

/**
 * Runs citation validation over every source in a validated analysis
 * result (blueprint §10) and attaches verification states.
 */
export function validateAnalysisCitations(
  result: AnalysisResult,
  pages: { pageNumber: number; text: string }[],
  isScanned: boolean
): { result: AnalysisResult; sources: VerifiedSource[]; stats: CitationStats } {
  const allSources: VerifiedSource[] = [];

  function annotateRequired<T extends { source: SourceLike }>(items: T[]): T[] {
    return items.map((item) => {
      const verified = validateSource(item.source, pages, isScanned);
      allSources.push(verified);
      return { ...item, source: verified };
    });
  }

  function annotateOptional<T extends { source?: SourceLike }>(items: T[]): T[] {
    return items.map((item) => {
      if (!item.source) return item;
      const verified = validateSource(item.source, pages, isScanned);
      allSources.push(verified);
      return { ...item, source: verified };
    });
  }

  const annotated: AnalysisResult = {
    overview: result.overview,
    highlights: annotateRequired(result.highlights),
    positive_points: annotateRequired(result.positive_points),
    concerns: annotateRequired(result.concerns),
    questions_to_ask: annotateOptional(result.questions_to_ask),
  };

  return {
    result: annotated,
    sources: allSources,
    stats: summarizeVerifications(allSources),
  };
}
