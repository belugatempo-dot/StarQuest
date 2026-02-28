import { test as cleanup } from "@playwright/test";

cleanup("cleanup auth states", async ({}) => {
  // No-op — auth state files are gitignored and cleaned on next setup run.
  // This project exists to satisfy Playwright's teardown requirement.
});
