import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import ApproveRedirectPage from "@/app/[locale]/(parent)/admin/approve/page";

describe("ApproveRedirectPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to dashboard approval-center section for en locale", async () => {
    await ApproveRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/admin/dashboard#approval-center");
  });

  it("redirects to dashboard approval-center section for zh-CN locale", async () => {
    await ApproveRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/admin/dashboard#approval-center");
  });
});
