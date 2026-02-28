import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Logout", () => {
  test("should redirect to login page after logout", async ({ parentPage }) => {
    await parentPage.goto("/en/activities");
    await expect(parentPage.locator("nav")).toBeVisible();
    // Click logout
    await parentPage.getByRole("button", { name: /logout|退出/i }).click();
    // Should redirect to login
    await parentPage.waitForURL(/\/en\/login/, { timeout: 10_000 });
    await expect(parentPage.getByLabel(/email/i)).toBeVisible();
  });
});
