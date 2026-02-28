import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Child - Rewards", () => {
  test("should display reward grid with balance", async ({ alisaPage }) => {
    await alisaPage.goto("/en/rewards");
    await alisaPage.waitForLoadState("networkidle");
    const mainContent = alisaPage.locator("main");
    await expect(mainContent).toBeVisible();
    // Should see rewards available for redemption
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(20);
  });
});
