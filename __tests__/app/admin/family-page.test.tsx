import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import FamilyRedirectPage from "@/app/[locale]/(parent)/admin/family/page";

describe("FamilyRedirectPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to dashboard family-management section for en locale", async () => {
    await FamilyRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/admin/dashboard#family-management");
  });

  it("redirects to dashboard family-management section for zh-CN locale", async () => {
    await FamilyRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/admin/dashboard#family-management");
  });
});
