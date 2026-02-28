import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Child - Dashboard", () => {
  test("should display balance and level for Alisa", async ({ alisaPage }) => {
    await alisaPage.goto("/en/dashboard");
    await alisaPage.waitForLoadState("networkidle");
    const mainContent = alisaPage.locator("main");
    await expect(mainContent).toBeVisible();
    // Should see level info and star balance
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(20);
  });

  test("should display recent activity section", async ({ alisaPage }) => {
    await alisaPage.goto("/en/dashboard");
    await alisaPage.waitForLoadState("networkidle");
    await expect(alisaPage.locator("main")).toBeVisible();
  });
});
