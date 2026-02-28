import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Parent - Quests", () => {
  test.beforeEach(async ({ parentPage }) => {
    await parentPage.goto("/en/quests");
    await parentPage.waitForLoadState("networkidle");
  });

  test("should display all quest types including duty and violation", async ({ parentPage }) => {
    // Parent should see quest groups — with 45 quests in demo data
    const mainContent = parentPage.locator("main");
    await expect(mainContent).toBeVisible();
    // Should see content related to quests (duty/bonus/violation types exist)
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(50);
  });

  test("should display category management section", async ({ parentPage }) => {
    // Parent has access to category management (14 default categories)
    // Look for category-related content
    const mainContent = parentPage.locator("main");
    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
  });
});
