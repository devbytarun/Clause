import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildTextPdf } from "../src/test-support/pdf-writer";

/**
 * Generates deterministic synthetic-but-realistic fixture PDFs used by
 * the pipeline CLI and the AI eval harness (blueprint §21).
 */
const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

const offerLetter: string[][] = [
  [
    "PULSE DYNAMICS PRIVATE LIMITED",
    "Letterhead: 42 Innovation Road, Bengaluru 560001",
    "",
    "Dear Aarav Sharma,",
    "",
    "We are pleased to offer you the position of Software Engineer II at",
    "Pulse Dynamics Private Limited. Your employment will commence on",
    "1 September 2026.",
    "",
    "Your annual fixed compensation will be INR 1,800,000, paid in twelve",
    "monthly instalments. You will be eligible for a performance bonus of",
    "up to ten percent of your annual fixed compensation, subject to",
    "company policy and management discretion.",
    "",
    "This offer is subject to your signing the enclosed confidentiality",
    "agreement and completing satisfactory background verification.",
  ],
  [
    "You will serve a probation period of six months from your date of",
    "joining. During probation either party may terminate this engagement",
    "with fifteen days written notice. After confirmation, the notice",
    "period on either side is sixty days.",
    "",
    "Your working hours are 9:30 AM to 6:30 PM, Monday through Friday, at",
    "our Bengaluru office. This role is office-based; remote work requires",
    "prior written approval from your reporting manager.",
    "",
    "To accept this offer, sign and return this letter within seven days,",
    "that is, no later than 15 August 2026. This offer may be withdrawn",
    "before acceptance at the sole discretion of the company.",
    "",
    "Sincerely,",
    "Meera Krishnan, Head of People Operations",
  ],
];

const nda: string[][] = [
  [
    "MUTUAL NON-DISCLOSURE AGREEMENT",
    "",
    "This Non-Disclosure Agreement is entered into as of 10 July 2026",
    "between Northwind Analytics LLP and the Receiving Party identified",
    "in the signature block below.",
    "",
    "1. Confidential Information means any non-public information",
    "disclosed by either party, including business plans, source code,",
    "customer lists and pricing, whether marked confidential or not.",
    "",
    "2. The Receiving Party shall protect Confidential Information with",
    "the same degree of care it uses for its own similar information,",
    "and no less than reasonable care.",
  ],
  [
    "3. Obligations under this Agreement survive for three years from",
    "the date of disclosure; obligations for trade secrets survive for",
    "as long as the information remains a trade secret under applicable",
    "law.",
    "",
    "4. Each party retains all rights to its Confidential Information.",
    "No licence or other rights are granted except as expressly stated.",
    "",
    "5. This Agreement is governed by the laws of the Republic of India.",
    "The courts of Bengaluru have exclusive jurisdiction over any dispute",
    "arising out of or in connection with this Agreement.",
    "",
    "Signed by the authorised representatives of the parties.",
  ],
];

const sparseAgreement: string[][] = [
  [
    "SERVICE AGREEMENT (DRAFT)",
    "",
    "This draft service agreement records a preliminary understanding",
    "between the parties regarding website maintenance services.",
    "",
    "Scope: monthly maintenance of the company website, including minor",
    "content updates and plugin updates.",
    "",
    "Fees and payment terms are to be agreed separately in writing.",
    "",
    "[Clauses intentionally omitted in this draft.]",
  ],
];

async function main() {
  await mkdir(FIXTURES_DIR, { recursive: true });
  await writeFile(
    path.join(FIXTURES_DIR, "offer-letter-sample.pdf"),
    buildTextPdf(offerLetter)
  );
  await writeFile(
    path.join(FIXTURES_DIR, "nda-sample.pdf"),
    buildTextPdf(nda)
  );
  await writeFile(
    path.join(FIXTURES_DIR, "sparse-agreement-draft.pdf"),
    buildTextPdf(sparseAgreement)
  );
  console.log("Wrote 3 fixtures to", FIXTURES_DIR);
}

void main();
