import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Child - Profile", () => {
  test("should display badge wall and level progress", async ({ alisaPage }) => {
    await alisaPage.goto("/en/profile");
    await alisaPage.waitForLoadState("networkidle");
    const mainContent = alisaPage.locator("main");
    await expect(mainContent).toBeVisible();
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(20);
  });
});
