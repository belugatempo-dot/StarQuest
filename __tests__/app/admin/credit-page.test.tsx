import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import CreditRedirectPage from "@/app/[locale]/(parent)/admin/credit/page";

describe("CreditRedirectPage (admin)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /profile#credit for en locale", async () => {
    await CreditRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/profile#credit");
  });

  it("redirects to /profile#credit for zh-CN locale", async () => {
    await CreditRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/profile#credit");
  });
});
