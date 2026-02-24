import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import ActivityPage from "@/app/[locale]/(parent)/admin/activity/page";

describe("Legacy ActivityPage redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /activities for en locale", async () => {
    await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/activities");
  });

  it("redirects to /activities for zh-CN locale", async () => {
    await ActivityPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/activities");
  });
});
