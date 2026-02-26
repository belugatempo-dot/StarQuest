import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import RewardsRedirectPage from "@/app/[locale]/(child)/app/rewards/page";

describe("RewardsRedirectPage (child)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /rewards for en locale", async () => {
    await RewardsRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/rewards");
  });

  it("redirects to /rewards for zh-CN locale", async () => {
    await RewardsRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/rewards");
  });
});
