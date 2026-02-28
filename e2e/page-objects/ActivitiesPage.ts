import type { Page, Locator } from "@playwright/test";

export class ActivitiesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly activityList: Locator;
  readonly filterBar: Locator;
  readonly generateReportButton: Locator;
  readonly statCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.activityList = page.locator("[data-testid='activity-list'], .activity-list, main");
    this.filterBar = page.locator("[data-testid='filter-bar'], .filter-bar").first();
    this.generateReportButton = page.getByRole("button", { name: /report|报告/i });
    this.statCards = page.locator("[data-testid='stat-card'], .stat-card");
  }

  async goto(locale = "en") {
    await this.page.goto(`/${locale}/activities`);
  }
}
