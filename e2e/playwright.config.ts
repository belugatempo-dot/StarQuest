import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // Auth setup — runs first, saves storage state for all roles
    { name: "setup", testMatch: /global-setup\.ts/, teardown: "cleanup" },
    { name: "cleanup", testMatch: /global-cleanup\.ts/ },

    // Desktop Chrome — runs all tests
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /responsive\.spec\.ts/,
    },

    // Mobile Safari — responsive tests only
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
      dependencies: ["setup"],
      testMatch: /responsive\.spec\.ts/,
    },

    // Tablet — responsive tests only
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"] },
      dependencies: ["setup"],
      testMatch: /responsive\.spec\.ts/,
    },
  ],

  // Auto-start dev server when no E2E_BASE_URL is set
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
