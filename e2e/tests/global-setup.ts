import { test as setup, expect } from "@playwright/test";
import { DEMO_USERS } from "./helpers";

/**
 * Global setup: authenticate each demo role via the DemoRolePicker UI
 * and save browser storage state for reuse across all tests.
 */
for (const user of DEMO_USERS) {
  setup(`authenticate as ${user.role}`, async ({ page }) => {
    // Navigate to demo login page
    await page.goto("/en/login?demo=true");

    // Click the role card matching this user's name
    await page.getByRole("button", { name: new RegExp(user.nameEn, "i") }).click();

    // Wait for redirect to activities page (demo login does hard navigation)
    await page.waitForURL(/\/en\/activities/, { timeout: 30_000 });

    // Verify we're logged in — the nav should be visible
    await expect(page.locator("nav")).toBeVisible();

    // Save storage state
    await page.context().storageState({ path: user.storageStatePath });
  });
}
