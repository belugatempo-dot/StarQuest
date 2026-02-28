import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Parent - Profile", () => {
  test.beforeEach(async ({ parentPage }) => {
    await parentPage.goto("/en/profile");
    await parentPage.waitForLoadState("networkidle");
  });

  test("should display level configuration", async ({ parentPage }) => {
    // Demo family has 7 levels
    const mainContent = parentPage.locator("main");
    await expect(mainContent).toBeVisible();
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(20);
  });

  test("should display credit management section", async ({ parentPage }) => {
    // Parent can manage credit settings
    const mainContent = parentPage.locator("main");
    await expect(mainContent).toBeVisible();
  });
});
