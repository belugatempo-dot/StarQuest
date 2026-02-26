import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import ChildDetailRedirectPage from "@/app/[locale]/(parent)/admin/children/[childId]/page";

describe("ChildDetailRedirectPage (admin)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /profile/children/:childId for en locale", async () => {
    await ChildDetailRedirectPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/profile/children/child-1");
  });

  it("redirects to /profile/children/:childId for zh-CN locale", async () => {
    await ChildDetailRedirectPage({
      params: Promise.resolve({ locale: "zh-CN", childId: "child-2" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/profile/children/child-2");
  });
});
