import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import AdminDashboardRedirect from "@/app/[locale]/(parent)/admin/dashboard/page";

describe("Legacy AdminDashboard redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /activities for en locale", async () => {
    await AdminDashboardRedirect({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/activities");
  });

  it("redirects to /activities for zh-CN locale", async () => {
    await AdminDashboardRedirect({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/activities");
  });
});
