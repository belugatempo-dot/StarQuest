jest.mock("next/server", () => {
  class MockNextResponse {
    cookies: any;
    status: number;
    constructor() {
      this.cookies = {
        set: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
      };
      this.status = 200;
    }
    static next(_opts?: any) {
      return new MockNextResponse();
    }
  }

  class MockNextRequest {
    url: string;
    cookies: any;
    nextUrl: any;
    headers: any;
    constructor(url: string) {
      this.url = url;
      this.cookies = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      };
      this.nextUrl = new URL(url);
      this.headers = new Map();
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

jest.mock("next-intl/middleware", () => {
  const innerFn = jest.fn().mockReturnValue({ _type: "intl-response" });
  const createFn = jest.fn().mockReturnValue(innerFn);
  // Expose inner fn via a property for test access
  (createFn as any).__innerFn = innerFn;
  return createFn;
});

jest.mock("@/lib/supabase/middleware", () => ({
  updateSession: jest.fn().mockResolvedValue({ _type: "session-response" }),
}));

jest.mock("@/i18n/config", () => ({
  locales: ["en", "zh-CN"],
}));

import { middleware, config } from "@/middleware";
import { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { updateSession } from "@/lib/supabase/middleware";

// Get the inner intl middleware fn
const intlMiddlewareFn = (createIntlMiddleware as any).__innerFn as jest.Mock;
const mockUpdateSession = updateSession as jest.Mock;

describe("middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls intl middleware first, then updateSession", async () => {
    const intlResp = { _type: "intl-resp-1" };
    intlMiddlewareFn.mockReturnValueOnce(intlResp);

    const request = new NextRequest("http://localhost:3000/en/admin");
    await middleware(request);

    expect(intlMiddlewareFn).toHaveBeenCalledWith(request);
    expect(mockUpdateSession).toHaveBeenCalledWith(request, intlResp);
  });

  it("returns the response from updateSession", async () => {
    const expectedResponse = { _type: "expected" };
    mockUpdateSession.mockResolvedValueOnce(expectedResponse);

    const request = new NextRequest("http://localhost:3000/en/login");
    const result = await middleware(request);

    expect(result).toBe(expectedResponse);
  });

  it("has correct matcher config", () => {
    expect(config.matcher).toEqual(["/", "/(zh-CN|en)/:path*"]);
  });

  it("passes request to intl middleware", async () => {
    const request = new NextRequest("http://localhost:3000/zh-CN/app");
    await middleware(request);

    expect(intlMiddlewareFn).toHaveBeenCalledTimes(1);
    expect(intlMiddlewareFn.mock.calls[0][0]).toBe(request);
  });
});
