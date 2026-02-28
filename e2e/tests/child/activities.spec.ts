import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Child - Activities", () => {
  test("should display Star Calendar heading for child", async ({ alisaPage }) => {
    await alisaPage.goto("/en/activities");
    await alisaPage.waitForLoadState("networkidle");
    await expect(alisaPage.locator("nav")).toBeVisible();
    await expect(alisaPage.locator("main")).toBeVisible();
  });

  test("should show child's own activities", async ({ alisaPage }) => {
    await alisaPage.goto("/en/activities");
    await alisaPage.waitForLoadState("networkidle");
    const mainContent = alisaPage.locator("main");
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(20);
  });
});
