import type { AnalysisResult } from "@/lib/schemas/analysis";

/**
 * Post-generation policy filter (blueprint §2/§9/§12).
 * Banned positioning — legal verdicts, numeric scores, privacy claims —
 * is stripped at the item level. Offending items are removed entirely;
 * removals are counted and reported so the pipeline can log them.
 */

const BANNED_PATTERNS: RegExp[] = [
  /\billegal(?:ity|ly)?\b/i,
  /\bun\s?enforceable\b/i,
  /\blegally\s+(?:safe|valid|binding|null and void)\b/i,
  /\bnot\s+legally\s+binding\b/i,
  /\byou\s+(?:will|shall|would)\s+win\b/i,
  /\b100%\s+private\b/i,
  /\bguaranteed?\s+(?:outcome|result|win)\b/i,
  /\b\d{1,3}\s*(?:\/|out of)\s*100\b/,
  /\brisk\s+(?:score|level|rating)\s*[:=]?\s*\d+/i,
  /\bmy (?:instructions|system prompt)s?\b/i,
];

export interface PolicyFilterOutcome {
  result: AnalysisResult;
  removedItems: number;
}

function containsBanned(text: string): boolean {
  return BANNED_PATTERNS.some((re) => re.test(text));
}

function itemTexts(...fields: (string | undefined | null)[]): string {
  return fields.filter(Boolean).join(" \n ");
}

function cleanNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return containsBanned(value) ? null : value;
}

export function applyPolicyFilter(
  input: AnalysisResult
): PolicyFilterOutcome {
  let removedItems = 0;

  const overviewFields = [
    input.overview.document_type,
    input.overview.compensation,
    input.overview.duration,
    input.overview.notice_period,
    input.overview.probation,
    input.overview.location,
    input.overview.hours,
  ];
  const cleanedOverviewFields = overviewFields.map(cleanNullableString);
  cleanedOverviewFields.forEach((clean, idx) => {
    if (overviewFields[idx] !== null && clean === null) removedItems++;
  });

  const overview = {
    ...input.overview,
    document_type: cleanedOverviewFields[0],
    compensation: cleanedOverviewFields[1],
    duration: cleanedOverviewFields[2],
    notice_period: cleanedOverviewFields[3],
    probation: cleanedOverviewFields[4],
    location: cleanedOverviewFields[5],
    hours: cleanedOverviewFields[6],
  };

  const highlights = input.highlights.filter((item) => {
    if (containsBanned(itemTexts(item.title, item.explanation))) {
      removedItems++;
      return false;
    }
    return true;
  });

  const positive_points = input.positive_points.filter((item) => {
    if (containsBanned(itemTexts(item.title, item.explanation))) {
      removedItems++;
      return false;
    }
    return true;
  });

  const concerns = input.concerns.filter((item) => {
    if (
      containsBanned(
        itemTexts(
          item.title,
          item.document_fact,
          item.interpretation,
          item.uncertainty,
          item.plain_english
        )
      )
    ) {
      removedItems++;
      return false;
    }
    return true;
  });

  const questions_to_ask = input.questions_to_ask.filter((q) => {
    if (containsBanned(itemTexts(q.question, q.rationale, q.related_concern_title))) {
      removedItems++;
      return false;
    }
    return true;
  });

  return {
    result: {
      ...input,
      overview,
      highlights,
      positive_points,
      concerns,
      questions_to_ask,
    },
    removedItems,
  };
}
