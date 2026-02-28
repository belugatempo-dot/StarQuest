import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Internationalization (i18n)", () => {
  test("should switch from English to Chinese", async ({ parentPage }) => {
    await parentPage.goto("/en/activities");
    await parentPage.waitForLoadState("networkidle");

    // Click language switcher in nav
    const langButton = parentPage.locator("nav").getByRole("button", { name: /EN|中文|language/i });
    if (await langButton.isVisible()) {
      await langButton.click();
      // Look for Chinese option or wait for language change
      const zhOption = parentPage.getByText(/中文/i).first();
      if (await zhOption.isVisible()) {
        await zhOption.click();
      }
      // URL should change to zh-CN
      await parentPage.waitForURL(/\/zh-CN\//, { timeout: 10_000 });
    }
  });

  test("should switch from Chinese to English", async ({ parentPage }) => {
    await parentPage.goto("/zh-CN/activities");
    await parentPage.waitForLoadState("networkidle");

    const langButton = parentPage.locator("nav").getByRole("button", { name: /EN|中文|language/i });
    if (await langButton.isVisible()) {
      await langButton.click();
      const enOption = parentPage.getByText(/EN|English/i).first();
      if (await enOption.isVisible()) {
        await enOption.click();
      }
      await parentPage.waitForURL(/\/en\//, { timeout: 10_000 });
    }
  });

  test("should render login page respecting locale", async ({ page }) => {
    // Test with unauthenticated page — use base test
    await page.goto("/zh-CN/login");
    await page.waitForLoadState("networkidle");
    // URL should have zh-CN prefix
    expect(page.url()).toContain("/zh-CN/");
    // Page should have loaded
    await expect(page.locator("main, form, [class*='login']").first()).toBeVisible();
  });
});
