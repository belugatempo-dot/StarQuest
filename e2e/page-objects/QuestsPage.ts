import type { Page, Locator } from "@playwright/test";

export class QuestsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly questGroups: Locator;
  readonly categorySection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.questGroups = page.locator("[data-testid='quest-group'], section, .quest-group");
    this.categorySection = page.getByText(/categor|分类/i).first();
  }

  async goto(locale = "en") {
    await this.page.goto(`/${locale}/quests`);
  }
}
