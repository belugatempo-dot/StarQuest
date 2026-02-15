import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import SettingsRedirectPage from "@/app/[locale]/(parent)/admin/settings/page";

describe("SettingsRedirectPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to dashboard for en locale", async () => {
    await SettingsRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/admin/dashboard");
  });

  it("redirects to dashboard for zh-CN locale", async () => {
    await SettingsRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/admin/dashboard");
  });
});
