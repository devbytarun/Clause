import { createHash } from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { cleanupUser, createTestUser } from "./helpers";
import { NOT_FOUND_TEMPLATE, EXTERNAL_LAW_TEMPLATE } from "../src/lib/chat/prompts";

/**
 * Full user journey against LIVE services (blueprint §20):
 * sign in → consent → upload → pipeline → ready → citations →
 * grounded chat (+ refusals) → delete → verified gone.
 */
const ready =
  Boolean(process.env.TEST_DATABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_KEY);

test.describe("full journey @live", () => {
  let sql: postgres.Sql;
  let userId = "";
  const email = `journey-${Date.now()}@clause-test.dev`;

  test.beforeAll(async () => {
    test.skip(!ready, "E2E env not configured");
    sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
  });

  test.afterAll(async () => {
    if (userId && sql) await cleanupUser(sql, userId);
    if (sql) await sql.end();
  });

  test("sign in → upload → analysis → chat → delete", async ({ page }) => {
    test.setTimeout(240_000);
    test.skip(!ready, "E2E env not configured");

    // ---- Sign in ----
    const user = await createTestUser(sql, email);
    userId = user.id;
    await page.goto(user.actionLink!);
    await page.waitForURL("**/dashboard");

    // ---- First-upload consent gate ----
    await expect(
      page.getByText("Documents are processed through cloud infrastructure")
    ).toBeVisible();
    await page.getByRole("checkbox").check();

    // ---- Upload a real PDF through the UI ----
    const fixturePath = path.resolve(
      __dirname,
      "../fixtures/offer-letter-sample.pdf"
    );
    await page.setInputFiles('input[type="file"]', fixturePath);
    await page.waitForURL(/\/documents\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const documentId = page.url().match(/[0-9a-f-]{36}/)![0];

    // ---- Pipeline runs to Ready (live Gemini) ----
    await expect(page.getByText("Ready", { exact: true })).toBeVisible({
      timeout: 180_000,
    });

    // ---- Analysis renders with verified citations ----
    await page.getByRole("tab", { name: "Concerns" }).click();
    await expect(page.locator("article").first()).toBeVisible();
    const frame = page.locator("iframe[title*='PDF viewer']");
    await expect(frame).toHaveAttribute("src", /object\/sign\/.+pdf/, {
      timeout: 20_000,
    });

    // ---- Grounded chat streams an answer citing a real page ----
    await page
      .locator("#chat-input")
      .fill("How much is the annual fixed compensation?");
    await page.getByRole("button", { name: "Send" }).click();
    const answer = page.locator("section[aria-label='Document chat'] >> text=(Page 1)").first();
    await expect(answer).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTitle(/This exact text was found/)).toBeAttached();

    // ---- Unanswerable question → exact not-found template ----
    await page
      .locator("#chat-input")
      .fill("What is the penalty for parking violations on Mars?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(NOT_FOUND_TEMPLATE)).toBeVisible({
      timeout: 60_000,
    });

    // ---- External-law trap → exact deflection template ----
    await page
      .locator("#chat-input")
      .fill("Is this contract legally valid under German law?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(EXTERNAL_LAW_TEMPLATE)).toBeVisible({
      timeout: 60_000,
    });

    // ---- Delete → gone everywhere ----
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Permanently Delete" }).click();
    await page.waitForURL("**/dashboard");
    const apiRes = await page.request.get(`/api/documents/${documentId}`);
    expect(apiRes.status()).toBe(404);
  });

  test("upload rejects non-PDF content with stable error", async ({ page }) => {
    test.skip(!ready, "E2E env not configured");
    const user = await createTestUser(sql, `${email.slice(0, -4)}-b.test`);
    await page.goto(user.actionLink!);
    await page.waitForURL("**/dashboard");

    await page.goto("/dashboard"); // consent persisted via localStorage flag
    const buffer = Buffer.from("MZ fake executable not a pdf");
    await page.setInputFiles('input[type="file"]', {
      name: "evil.pdf",
      mimeType: "application/pdf",
      buffer,
    });
    await expect(page.getByText(/Only PDF files are supported/i)).toBeVisible({
      timeout: 15_000,
    });
    void createHash;
  });
});
