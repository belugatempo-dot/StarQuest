import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import ChildDashboardRedirect from "@/app/[locale]/(child)/app/page";

describe("Legacy ChildDashboard redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /activities for en locale", async () => {
    await ChildDashboardRedirect({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/activities");
  });

  it("redirects to /activities for zh-CN locale", async () => {
    await ChildDashboardRedirect({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/activities");
  });
});
