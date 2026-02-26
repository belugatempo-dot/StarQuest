import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import RecordRedirectPage from "@/app/[locale]/(parent)/admin/record/page";

describe("RecordRedirectPage (admin)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /record for en locale", async () => {
    await RecordRedirectPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/record");
  });

  it("redirects to /record for zh-CN locale", async () => {
    await RecordRedirectPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(redirect).toHaveBeenCalledWith("/zh-CN/record");
  });
});
