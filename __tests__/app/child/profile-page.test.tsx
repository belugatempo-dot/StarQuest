import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import ProfileRedirectPage from "@/app/[locale]/(child)/app/profile/page";

describe("ProfileRedirectPage (child)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /profile for en locale", async () => {
    await ProfileRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/profile");
  });

  it("redirects to /profile for zh-CN locale", async () => {
    await ProfileRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/profile");
  });
});
