import { createHash } from "node:crypto";
import postgres from "postgres";
import { buildTextPdf } from "../src/test-support/pdf-writer";

/**
 * E2E seeding helpers. Identity is created through the Supabase Admin
 * API (service key, server-side only); app rows go straight into the
 * test Postgres so the journey under test is the UI, not setup.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function requireEnv() {
  if (!SUPABASE_URL || !SERVICE_KEY || !process.env.TEST_DATABASE_URL) {
    throw new Error(
      "E2E requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY and TEST_DATABASE_URL"
    );
  }
}

/** Creates (or reuses) a confirmed user via Admin API and returns their id. */
export async function createTestUser(
  sql: postgres.Sql,
  email: string
): Promise<{ id: string; actionLink: string | null }> {
  requireEnv();

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });

  if (!res.ok) {
    throw new Error(
      `generate_link failed ${res.status}: ${await res.text().catch(() => "")}`
    );
  }
  /**
   * Admin API returns a flat user object:
   * { id, email, action_link, email_otp, ... }
   */
  const body = (await res.json()) as {
    id?: string;
    user?: { id?: string };
    properties?: { action_link?: string };
    action_link?: string;
  };
  const userId = body.id ?? body.user?.id;
  if (!userId) throw new Error("generate_link returned no user id");
  const actionLink = body.action_link ?? body.properties?.action_link ?? null;

  // Mirror into app users table exactly as getSessionUser would.
  await sql`
    INSERT INTO users (id, email) VALUES (${userId}, ${email})
    ON CONFLICT (id) DO NOTHING
  `;
  return { id: userId, actionLink };
}

export interface SeededDocument {
  id: string;
  pageWithQuote: number;
  storagePath: string;
}

/**
 * Uploads the real fixture PDF into the private bucket via the service
 * key so signed-URL issuance (which validates object existence) works.
 */
async function uploadObject(storagePath: string): Promise<void> {
  const base = SUPABASE_URL!;
  const bytes = buildTextPdf([
    [
      "MUTUAL NON-DISCLOSURE AGREEMENT between TestCo and Counterparty.",
      "Effective date: 1 March 2026.",
    ],
    [
      "CONFIDENTIALITY TERMS. The receiving party acknowledges that",
      "obligations survive for three years from the date of disclosure.",
    ],
  ]);
  const res = await fetch(
    `${base}/storage/v1/object/${process.env.STORAGE_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY!,
        "Content-Type": "application/pdf",
      },
      body: new Uint8Array(bytes),
    }
  );
  if (!res.ok) {
    throw new Error(`object upload failed ${res.status}`);
  }
}

/**
 * Seeds a ready document whose analysis cites an exact quote on page 2,
 * exercising the citation-jump journey end-to-end.
 */
export async function seedReadyDocument(
  sql: postgres.Sql,
  userId: string,
  filename: string
): Promise<SeededDocument> {
  const docId = crypto.randomUUID();
  const quote = "obligations survive for three years";
  const pageText =
    "CONFIDENTIALITY TERMS. The receiving party acknowledges that " +
    "obligations survive for three years from the date of disclosure " +
    "and continue thereafter for trade secrets.";
  const storagePath = `${userId}/${docId}.pdf`;

  await uploadObject(storagePath);

  await sql`
    INSERT INTO documents (id, user_id, original_filename, mime_type, size_bytes, sha256, storage_path, status, page_count, char_count, is_scanned)
    VALUES (${docId}, ${userId}, ${filename}, 'application/pdf', 1024,
            ${createHash("sha256").update(docId).digest("hex")}, ${storagePath},
            'ready', 2, 900, false)
  `;
  await sql`
    INSERT INTO document_pages (document_id, page_number, text)
    VALUES
      (${docId}, 1, 'MUTUAL NON-DISCLOSURE AGREEMENT between TestCo and Counterparty. Effective date: 1 March 2026.'),
      (${docId}, 2, ${pageText})
  `;

  const analysis = {
    overview: { document_type: "nda" },
    highlights: [],
    positive_points: [],
    concerns: [
      {
        title: "Survival period",
        priority: "moderate",
        document_fact: "Obligations survive three years.",
        interpretation: "Sharing details may stay restricted.",
        uncertainty: "Treatment depends on applicable law.",
        plain_english: "Restrictions last three years.",
        source: { page: 2, quote, verification: "verified" },
      },
    ],
    questions_to_ask: [],
  };

  await sql`
    INSERT INTO analyses (document_id, model_id, status, result, summary_text)
    VALUES (${docId}, 'gemini-3.6-flash', 'complete', ${JSON.stringify(analysis)}::jsonb, 'NDA summary')
  `;

  return { id: docId, pageWithQuote: 2, storagePath };
}

export async function cleanupUser(
  sql: postgres.Sql,
  userId: string,
  storagePaths: string[] = []
) {
  for (const p of storagePaths) {
    await fetch(
      `${SUPABASE_URL}/storage/v1/${process.env.STORAGE_BUCKET}/${p}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY! } }
    ).catch(() => undefined);
  }
  await sql`DELETE FROM users WHERE id = ${userId}`;
}
