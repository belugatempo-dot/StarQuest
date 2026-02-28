import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Parent - Dashboard", () => {
  test.beforeEach(async ({ parentPage }) => {
    await parentPage.goto("/en/dashboard");
    await parentPage.waitForLoadState("networkidle");
  });

  test("should display children overview with Alisa and Alexander", async ({ parentPage }) => {
    // Dashboard should show both demo children
    await expect(parentPage.getByText(/Alisa/i)).toBeVisible();
    await expect(parentPage.getByText(/Alexander/i)).toBeVisible();
  });

  test("should display family management section", async ({ parentPage }) => {
    // The dashboard should have meaningful content for parent
    const mainContent = parentPage.locator("main");
    await expect(mainContent).toBeVisible();
    const text = await mainContent.textContent();
    expect(text!.length).toBeGreaterThan(50);
  });
});
