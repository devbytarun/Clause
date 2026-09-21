import { expect, test } from "@playwright/test";
import postgres from "postgres";
import {
  cleanupUser,
  createTestUser,
  seedReadyDocument,
} from "./helpers";

/**
 * Citation-jump journey (blueprint §20/Phase 5 DoD):
 * sign in via magic link → open document → click a verified citation's
 * page badge → viewer jumps to the correct page.
 */
const ready =
  Boolean(process.env.TEST_DATABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_KEY) &&
  Boolean(process.env.E2E_BASE_URL);

test.describe("citation jump", () => {
  let sql: postgres.Sql;
  let userId = "";
  let documentId = "";
  let storagePath = "";
  const email = `e2e-${Date.now()}@clause-test.dev`;

  test.beforeAll(async () => {
    test.skip(!ready, "E2E env not configured");
    sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
  });

  test.afterAll(async () => {
    if (userId && sql) await cleanupUser(sql, userId, storagePath ? [storagePath] : []);
    if (sql) await sql.end();
  });

  test("verified citation badge opens the cited page in the viewer", async ({
    page,
  }) => {
    test.skip(!ready, "E2E env not configured");

    // 1. Sign in through the real Supabase magic-link flow.
    const user = await createTestUser(sql, email);
    userId = user.id;
    expect(user.actionLink).toBeTruthy();
    await page.goto(user.actionLink!);
    await page.waitForURL("**/dashboard");

    // 2. Seed a ready document for this user and open its workspace.
    const doc = await seedReadyDocument(sql, userId, "e2e-nda.pdf");
    documentId = doc.id;
    storagePath = doc.storagePath;
    await page.goto(`/documents/${documentId}`);

    // 3. Concerns live on their own tab; open it and find the seeded card.
    await page.getByRole("tab", { name: "Concerns" }).click();
    const concernHeading = page.getByRole("heading", { name: "Survival period" });
    await expect(concernHeading).toBeVisible();

    // 3. The concern card shows a verified evidence block; clicking the
    //    page badge navigates to the page panel for page 2.
    const badge = page.getByRole("link", { name: "Page 2" }).first();
    await expect(badge).toBeVisible();

    // Verified-evidence tooltip vocabulary is present on this tab.
    await expect(
      page.getByTitle("This exact text was found on the cited page.").first()
    ).toBeAttached();

    // 4. The embedded viewer loads a real signed PDF at page 1…
    const frame = page.locator("iframe[title*='PDF viewer']");
    await expect(frame).toHaveAttribute("src", /object\/sign\/.+pdf/, {
      timeout: 15000,
    });
    await expect(frame).toHaveAttribute("src", /#page=1/);

    // …and jumps to the cited page after clicking the evidence badge.
    await badge.click();
    await expect(frame).toHaveAttribute("src", /#page=2/);
  });
});
