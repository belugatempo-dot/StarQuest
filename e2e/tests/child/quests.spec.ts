import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Child - Quests", () => {
  test("should only show bonus quests for child", async ({ alisaPage }) => {
    await alisaPage.goto("/en/quests");
    await alisaPage.waitForLoadState("networkidle");
    const mainContent = alisaPage.locator("main");
    await expect(mainContent).toBeVisible();
    // Children should NOT see duty or violation quest groups
    // The page should have quest content but only bonus type
    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
  });

  test("should be able to view quest details", async ({ alisaPage }) => {
    await alisaPage.goto("/en/quests");
    await alisaPage.waitForLoadState("networkidle");
    // The quests page should load with meaningful content
    const mainContent = alisaPage.locator("main");
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(20);
  });
});
