import { normalizeText, similarityRatio } from "@/lib/citations/normalize";
import type { Source, VerifiedSource } from "@/lib/schemas/analysis";

export interface PageText {
  pageNumber: number;
  text: string;
}

const FUZZY_THRESHOLD = 0.92;
/** Quote length tolerance for the sliding window (±15%). */
const WINDOW_FLEX = 0.15;

function findExact(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

function findFuzzy(pageNorm: string, quoteNorm: string): boolean {
  const qLen = quoteNorm.length;
  const minWin = Math.max(1, Math.floor(qLen * (1 - WINDOW_FLEX)));
  const maxWin = Math.ceil(qLen * (1 + WINDOW_FLEX));

  // Quick containment check first.
  if (findExact(pageNorm, quoteNorm)) return true;

  for (let win = minWin; win <= maxWin; win++) {
    if (win > pageNorm.length) break;
    for (let start = 0; start + win <= pageNorm.length; start++) {
      const candidate = pageNorm.slice(start, start + win);
      if (similarityRatio(candidate, quoteNorm) >= FUZZY_THRESHOLD) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Validates a model-provided citation against extracted page text.
 *
 * Order: exact match on cited page → fuzzy on cited page → exact/fuzzy
 * on any other page (page correction) → rejected (unverified).
 */
export function validateSource(
  source: Source,
  pages: PageText[],
  isScanned = false
): VerifiedSource {
  if (isScanned) {
    return { ...source, verification: "unverified" };
  }

  const quoteNorm = normalizeText(source.quote);
  if (quoteNorm.length === 0) {
    return { ...source, verification: "unverified" };
  }

  const normalizedPages = pages.map((p) => ({
    pageNumber: p.pageNumber,
    norm: normalizeText(p.text),
  }));

  const cited =
    normalizedPages.find((p) => p.pageNumber === source.page) ?? null;

  if (cited) {
    if (findExact(cited.norm, quoteNorm)) {
      return { ...source, verification: "verified" };
    }
    if (findFuzzy(cited.norm, quoteNorm)) {
      return { ...source, verification: "verified_fuzzy" };
    }
  }

  for (const p of normalizedPages) {
    if (cited && p.pageNumber === cited.pageNumber) continue;
    if (findExact(p.norm, quoteNorm) || findFuzzy(p.norm, quoteNorm)) {
      return {
        ...source,
        verification: "page_corrected",
        correctedPage: p.pageNumber,
      };
    }
  }

  return { ...source, verification: "unverified" };
}

export interface CitationStats {
  total: number;
  verified: number;
  verifiedFuzzy: number;
  pageCorrected: number;
  unverified: number;
}

export function summarizeVerifications(
  sources: VerifiedSource[]
): CitationStats {
  const stats: CitationStats = {
    total: sources.length,
    verified: 0,
    verifiedFuzzy: 0,
    pageCorrected: 0,
    unverified: 0,
  };
  for (const s of sources) {
    switch (s.verification) {
      case "verified":
        stats.verified++;
        break;
      case "verified_fuzzy":
        stats.verifiedFuzzy++;
        break;
      case "page_corrected":
        stats.pageCorrected++;
        break;
      case "unverified":
        stats.unverified++;
        break;
    }
  }
  return stats;
}
