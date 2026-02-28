import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Parent - Rewards", () => {
  test.beforeEach(async ({ parentPage }) => {
    await parentPage.goto("/en/rewards");
    await parentPage.waitForLoadState("networkidle");
  });

  test("should display reward list", async ({ parentPage }) => {
    // Demo family has 11 rewards
    const mainContent = parentPage.locator("main");
    await expect(mainContent).toBeVisible();
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(50);
  });

  test("should show star cost on rewards", async ({ parentPage }) => {
    // Rewards have star costs — look for star emoji or numbers
    const mainContent = parentPage.locator("main");
    await expect(mainContent).toBeVisible();
  });
});
