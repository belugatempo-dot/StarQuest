import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Navigation", () => {
  test("should navigate to all 5 tabs correctly", async ({ parentPage }) => {
    const tabs = [
      { name: /calendar|activities|星星日历/i, url: /\/activities/ },
      { name: /dashboard|主页/i, url: /\/dashboard/ },
      { name: /quests|任务/i, url: /\/quests/ },
      { name: /rewards|奖励/i, url: /\/rewards/ },
      { name: /profile|个人/i, url: /\/profile/ },
    ];

    await parentPage.goto("/en/activities");
    await parentPage.waitForLoadState("networkidle");

    for (const tab of tabs) {
      const navLink = parentPage.locator("nav").getByRole("link", { name: tab.name });
      await navLink.click();
      await parentPage.waitForURL(tab.url);
      await expect(parentPage.locator("main")).toBeVisible();
    }
  });

  test("should highlight active tab", async ({ parentPage }) => {
    await parentPage.goto("/en/activities");
    await parentPage.waitForLoadState("networkidle");
    // The active tab should have the active styling (bg-primary)
    const activeTab = parentPage.locator("nav").getByRole("link", { name: /calendar|activities|星星日历/i });
    await expect(activeTab).toBeVisible();
    // Check that the link has the active class
    const className = await activeTab.getAttribute("class");
    expect(className).toContain("bg-primary");
  });

  test("should navigate to Star Calendar when clicking logo", async ({ parentPage }) => {
    await parentPage.goto("/en/dashboard");
    await parentPage.waitForLoadState("networkidle");
    // Click the logo (first link in nav)
    const logo = parentPage.locator("nav").getByRole("link").first();
    await logo.click();
    await parentPage.waitForURL(/\/activities/);
    await expect(parentPage.locator("main")).toBeVisible();
  });
});
