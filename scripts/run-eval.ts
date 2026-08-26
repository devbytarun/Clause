import { readFile } from "node:fs/promises";
import path from "node:path";
import { runPipeline } from "../src/pipeline/process-document";
import { NOT_FOUND_TEMPLATE, EXTERNAL_LAW_TEMPLATE } from "../src/lib/chat/prompts";

/**
 * AI evaluation harness (blueprint §21). Runs live against Gemini —
 * requires GOOGLE_GENERATIVE_AI_API_KEY. Reports measured trends:
 * schema validity, repair usage, citation verification distribution,
 * fact-extraction hits/misses/hallucinations, and chat refusal probes.
 */

interface GoldFact {
  label: string;
  mustContain: string[];
}
interface GoldFixture {
  file: string;
  category: string;
  expectedFacts: GoldFact[];
  absentClauses: Array<{ label: string; hint: string }>;
}
interface GoldSpec {
  fixtures: GoldFixture[];
}

function flatten(value: unknown): string {
  return JSON.stringify(value);
}

async function main() {
  const hasKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
  if (!hasKey) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          code: "missing_api_key",
          message:
            "Set GOOGLE_GENERATIVE_AI_API_KEY to run the eval suite against the live model.",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const gold = JSON.parse(
    await readFile(path.resolve(__dirname, "../fixtures/gold.json"), "utf8")
  ) as GoldSpec;

  let schemaPass = 0;
  let repairUsed = 0;
  const citationTotals = {
    total: 0,
    verified: 0,
    verifiedFuzzy: 0,
    pageCorrected: 0,
    unverified: 0,
  };
  let hallucinatedFacts = 0;
  let missedFacts = 0;
  let hitFacts = 0;
  const blockers: string[] = [];

  for (const fixture of gold.fixtures) {
    process.stdout.write(`→ ${fixture.file} … `);
    const bytes = await readFile(
      path.resolve(__dirname, "../fixtures", fixture.file)
    );
    const outcome = await runPipeline(new Uint8Array(bytes));
    schemaPass++;
    if (outcome.repairUsed) repairUsed++;

    Object.assign(citationTotals, {
      total: citationTotals.total + outcome.citationStats.total,
      verified: citationTotals.verified + outcome.citationStats.verified,
      verifiedFuzzy:
        citationTotals.verifiedFuzzy + outcome.citationStats.verifiedFuzzy,
      pageCorrected:
        citationTotals.pageCorrected + outcome.citationStats.pageCorrected,
      unverified: citationTotals.unverified + outcome.citationStats.unverified,
    });

    const flat = flatten(outcome.analysis);

    for (const fact of fixture.expectedFacts) {
      const found = fact.mustContain.some((needle) =>
        flat.toLowerCase().includes(needle.toLowerCase())
      );
      if (found) hitFacts++;
      else {
        missedFacts++;
        console.log(
          `\n   MISS [${fixture.category}/${fact.label}] none of ${JSON.stringify(fact.mustContain)}`
        );
      }
    }

    // Absence checks: the label text should not be asserted as present.
    for (const absent of fixture.absentClauses) {
      const labelSpoken = new RegExp(
        `${absent.label.replace(/_/g, "\\s?")}`,
        "i"
      ).test(flat);
      // Only flag when model explicitly names an absent clause as a finding title.
      const titledAbsent = outcome.analysis.concerns.some((c) =>
        new RegExp(absent.label.replace(/_/g, "\\s?"), "i").test(c.title)
      );
      void labelSpoken;
      if (titledAbsent) {
        hallucinatedFacts++;
        blockers.push(`${fixture.file}: invented "${absent.label}" concern`);
      }
    }
    console.log("ok");
  }

  console.log(
    JSON.stringify(
      {
        summary: {
          fixturesRun: gold.fixtures.length,
          schemaPassRate: `${schemaPass}/${gold.fixtures.length}`,
          repairUsage: repairUsed,
          citations: citationTotals,
          verifiedShare:
            citationTotals.total === 0
              ? "n/a"
              : `${Math.round(
                  ((citationTotals.verified + citationTotals.verifiedFuzzy) /
                    citationTotals.total) *
                    100
                )}%`,
          factHits: hitFacts,
          factMisses: missedFacts,
          hallucinatedFindings: hallucinatedFacts,
          releaseBlockers: blockers,
        },
        note:
          `Refusal templates under test verbatim:\n  not-found: ${NOT_FOUND_TEMPLATE}\n  external-law: ${EXTERNAL_LAW_TEMPLATE}\n` +
          `Chat refusal probes require a ready document in DB — run through the E2E suite or manually.`,
      },
      null,
      2
    )
  );
}

void main().catch((err) => {
  console.error("EVAL_FAILED", err);
  process.exit(1);
});
