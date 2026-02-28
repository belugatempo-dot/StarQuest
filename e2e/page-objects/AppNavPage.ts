import type { Page, Locator } from "@playwright/test";

export class AppNavPage {
  readonly page: Page;
  readonly nav: Locator;
  readonly logo: Locator;
  readonly parentBadge: Locator;
  readonly logoutButton: Locator;
  readonly languageSwitcher: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = page.locator("nav");
    this.logo = page.locator("nav").getByRole("link").first();
    this.parentBadge = page.locator("nav").getByText(/parent|家长/i);
    this.logoutButton = page.getByRole("button", { name: /logout|退出/i });
    this.languageSwitcher = page.locator("nav").getByRole("button", { name: /EN|中文/i });
  }

  getNavTab(name: string) {
    return this.nav.getByRole("link", { name: new RegExp(name, "i") });
  }

  async navigateTo(path: string, locale = "en") {
    await this.page.goto(`/${locale}/${path}`);
  }

  async logout() {
    await this.logoutButton.click();
  }
}
