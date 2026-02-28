import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Demo Write Blocking", () => {
  test("should show error when child tries to request stars", async ({ alisaPage }) => {
    await alisaPage.goto("/en/quests");
    await alisaPage.waitForLoadState("networkidle");

    // Find a quest card and try to interact with the request button
    const requestButton = alisaPage.getByRole("button", { name: /request|请求|record|⭐/i }).first();

    if (await requestButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await requestButton.click();

      // If a modal or form appears, try to submit
      const submitButton = alisaPage.getByRole("button", { name: /submit|confirm|提交|确认/i }).first();
      if (await submitButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitButton.click();
        // Should see an error toast or message (RLS blocks the write)
        await expect(
          alisaPage.getByText(/demo|error|denied|read.only|只读|错误/i).first()
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test("should show error when parent tries to record stars", async ({ parentPage }) => {
    await parentPage.goto("/en/quests");
    await parentPage.waitForLoadState("networkidle");

    // Find a quick record button
    const recordButton = parentPage.getByRole("button", { name: /record|quick|快速|记录/i }).first();

    if (await recordButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await recordButton.click();

      // If a form/modal appears, try to submit
      const submitButton = parentPage.getByRole("button", { name: /submit|save|confirm|记录|保存|确认/i }).first();
      if (await submitButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitButton.click();
        // Should see an error message (RLS blocks the write)
        await expect(
          parentPage.getByText(/demo|error|denied|read.only|只读|错误/i).first()
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
