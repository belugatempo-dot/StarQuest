import type { Page, Locator } from "@playwright/test";

export class RewardsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rewardList: Locator;
  readonly balanceDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.rewardList = page.locator("main");
    this.balanceDisplay = page.getByText(/balance|余额|star|星/i).first();
  }

  async goto(locale = "en") {
    await this.page.goto(`/${locale}/rewards`);
  }
}
