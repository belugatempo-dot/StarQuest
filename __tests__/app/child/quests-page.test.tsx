import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import QuestsRedirectPage from "@/app/[locale]/(child)/app/quests/page";

describe("QuestsRedirectPage (child)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /quests for en locale", async () => {
    await QuestsRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/quests");
  });

  it("redirects to /quests for zh-CN locale", async () => {
    await QuestsRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/quests");
  });
});
