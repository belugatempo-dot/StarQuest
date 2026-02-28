import type { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly childrenCards: Locator;
  readonly familySection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.childrenCards = page.locator("[data-testid='child-card'], .child-card");
    this.familySection = page.locator("main");
  }

  async goto(locale = "en") {
    await this.page.goto(`/${locale}/dashboard`);
  }
}
