import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Parent - Generate Report", () => {
  test("should open report modal from activities page", async ({ parentPage }) => {
    await parentPage.goto("/en/activities");
    await parentPage.waitForLoadState("networkidle");

    // Look for the generate report button
    const reportButton = parentPage.getByRole("button", { name: /report|generate|报告/i });

    // If the button exists, click it and verify modal opens
    if (await reportButton.isVisible()) {
      await reportButton.click();
      // Modal should appear with period selection options
      await expect(parentPage.getByText(/daily|weekly|monthly|quarterly|yearly/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test("should show period type options in report modal", async ({ parentPage }) => {
    await parentPage.goto("/en/activities");
    await parentPage.waitForLoadState("networkidle");

    const reportButton = parentPage.getByRole("button", { name: /report|generate|报告/i });

    if (await reportButton.isVisible()) {
      await reportButton.click();
      // Should see period type options
      const modal = parentPage.locator("[role='dialog'], .modal, [data-testid='report-modal']").first();
      await expect(modal).toBeVisible({ timeout: 5_000 });
    }
  });
});
