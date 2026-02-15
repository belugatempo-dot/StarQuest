import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import AdminRedirectPage from "@/app/[locale]/(parent)/admin/page";

describe("AdminRedirectPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to activity page for en locale", async () => {
    await AdminRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/admin/activity");
  });

  it("redirects to activity page for zh-CN locale", async () => {
    await AdminRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/admin/activity");
  });
});
