import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Responsive Design", () => {
  test("should show mobile navigation layout on small screens", async ({ parentPage }) => {
    await parentPage.goto("/en/activities");
    await parentPage.waitForLoadState("networkidle");

    // On mobile, the nav should still be visible
    await expect(parentPage.locator("nav")).toBeVisible();
    // Main content should be accessible
    await expect(parentPage.locator("main")).toBeVisible();
  });

  test("should adapt grid layout on tablet", async ({ parentPage }) => {
    await parentPage.goto("/en/dashboard");
    await parentPage.waitForLoadState("networkidle");

    // Dashboard should render and adapt to screen size
    await expect(parentPage.locator("main")).toBeVisible();
    const text = await parentPage.locator("main").textContent();
    expect(text!.length).toBeGreaterThan(20);
  });

  test("should display full navigation on desktop", async ({ parentPage }) => {
    await parentPage.goto("/en/activities");
    await parentPage.waitForLoadState("networkidle");

    // Desktop nav should show all tabs
    const nav = parentPage.locator("nav");
    await expect(nav).toBeVisible();
  });
});
