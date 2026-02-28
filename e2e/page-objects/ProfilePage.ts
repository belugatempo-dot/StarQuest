import type { Page, Locator } from "@playwright/test";

export class ProfilePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly levelsSection: Locator;
  readonly creditSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.levelsSection = page.getByText(/level|等级/i).first();
    this.creditSection = page.getByText(/credit|信用/i).first();
  }

  async goto(locale = "en") {
    await this.page.goto(`/${locale}/profile`);
  }
}
