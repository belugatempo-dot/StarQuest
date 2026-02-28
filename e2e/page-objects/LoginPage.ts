import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly demoButton: Locator;
  readonly registerLink: Locator;
  readonly logo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole("button", { name: /login|登录/i });
    this.demoButton = page.getByRole("link", { name: /demo|试用/i });
    this.registerLink = page.getByRole("link", { name: /register|注册/i });
    this.logo = page.locator("text=StarQuest");
  }

  async goto(locale = "en") {
    await this.page.goto(`/${locale}/login`);
  }

  async gotoDemoMode(locale = "en") {
    await this.page.goto(`/${locale}/login?demo=true`);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
