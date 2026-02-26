import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import LevelsRedirectPage from "@/app/[locale]/(parent)/admin/levels/page";

describe("LevelsRedirectPage (admin)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /profile#levels for en locale", async () => {
    await LevelsRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/profile#levels");
  });

  it("redirects to /profile#levels for zh-CN locale", async () => {
    await LevelsRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/profile#levels");
  });
});
