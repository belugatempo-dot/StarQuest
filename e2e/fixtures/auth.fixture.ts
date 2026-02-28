import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";
import { getStorageStatePath } from "../tests/helpers";

type AuthFixtures = {
  parentPage: Page;
  alisaPage: Page;
  alexanderPage: Page;
};

export const test = base.extend<AuthFixtures>({
  parentPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: getStorageStatePath("parent") });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  alisaPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: getStorageStatePath("alisa") });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  alexanderPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: getStorageStatePath("alexander") });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect } from "@playwright/test";
