import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should render login form with all elements", async ({ page }) => {
    await page.goto("/en/login");
    // Logo / branding
    await expect(page.getByText("StarQuest")).toBeVisible();
    // Form fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    // Login button
    await expect(
      page.getByRole("button", { name: /login|sign in/i })
    ).toBeVisible();
    // Register link
    await expect(
      page.getByRole("link", { name: /register|sign up|注册/i })
    ).toBeVisible();
  });

  test("should show required validation on empty submit", async ({ page }) => {
    await page.goto("/en/login");
    // The email and password inputs have HTML required attribute
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(passwordInput).toHaveAttribute("required", "");
  });
});
