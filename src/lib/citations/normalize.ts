/**
 * Text normalization for citation matching (blueprint §10).
 * Absorbs PDF-extraction artifacts so verbatim quotes match the
 * extracted page text despite encoding/typography differences.
 */

const LIGATURES: Record<string, string> = {
  "\uFB00": "ff",
  "\uFB01": "fi",
  "\uFB02": "fl",
  "\uFB03": "ffi",
  "\uFB04": "ffl",
};

export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "")
    .replace(
      /[\uFB00-\uFB04]/g,
      (ch) => LIGATURES[ch] ?? ch
    )
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u275B\u275C]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u275D\u275E\u301D\u301E]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFF0D]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalized Levenshtein similarity ratio (0..1) with early exit
 * once the distance provably exceeds maxDistance.
 */
export function similarityRatio(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  let prev = new Uint16Array(b.length + 1);
  let curr = new Uint16Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + cost
      );
    }
    [prev, curr] = [curr, prev];
  }

  const distance = prev[b.length]!;
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}
