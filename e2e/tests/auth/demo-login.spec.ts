import { test, expect } from "@playwright/test";

test.describe("Demo Login", () => {
  test("should login as parent and land on activities", async ({ page }) => {
    await page.goto("/en/login?demo=true");
    await page.getByRole("button", { name: /Parent/i }).click();
    await page.waitForURL(/\/en\/activities/, { timeout: 30_000 });
    // Parent badge should be visible in nav
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.getByText(/parent/i).first()).toBeVisible();
  });

  test("should login as Alisa and land on activities", async ({ page }) => {
    await page.goto("/en/login?demo=true");
    await page.getByRole("button", { name: /Alisa/i }).click();
    await page.waitForURL(/\/en\/activities/, { timeout: 30_000 });
    await expect(page.locator("nav")).toBeVisible();
  });

  test("should login as Alexander and land on activities", async ({ page }) => {
    await page.goto("/en/login?demo=true");
    await page.getByRole("button", { name: /Alexander/i }).click();
    await page.waitForURL(/\/en\/activities/, { timeout: 30_000 });
    await expect(page.locator("nav")).toBeVisible();
  });
});
