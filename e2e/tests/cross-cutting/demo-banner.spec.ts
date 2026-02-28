import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Demo Banner", () => {
  test("should show demo mode banner for demo users", async ({ parentPage }) => {
    await parentPage.goto("/en/activities");
    await parentPage.waitForLoadState("networkidle");

    // Demo users should see a persistent demo banner
    const demoBanner = parentPage.getByText(/demo|试用|演示/i).first();
    await expect(demoBanner).toBeVisible({ timeout: 10_000 });
  });
});
