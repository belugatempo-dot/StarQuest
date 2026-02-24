jest.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    headers: Map<string, string>;
    constructor(url: string, opts?: any) {
      this.url = url;
      this.headers = new Map(Object.entries(opts?.headers || {}));
    }
  }
  class MockNextResponse {
    static json(body: any, init?: any) {
      return { body, status: init?.status || 200 };
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

const mockVerifyCronAuth = jest.fn();
jest.mock("@/lib/api/cron-auth", () => ({
  verifyCronAuth: (...args: any[]) => mockVerifyCronAuth(...args),
}));

function buildChainMock(resolvedValue: any = { data: [], error: null }) {
  const chain: any = {};
  const methods = ["select", "eq", "order", "limit", "single", "maybeSingle"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  Object.defineProperty(chain, "then", {
    value: (resolve: any) => resolve(resolvedValue),
    writable: true,
    configurable: true,
  });
  return chain;
}

const mockFrom = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/keep-alive/route";

describe("GET /api/keep-alive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when auth fails", async () => {
    const authError = { body: { error: "Unauthorized" }, status: 401 };
    mockVerifyCronAuth.mockReturnValue(authError);

    const request = new NextRequest("http://localhost/api/keep-alive");
    const response = await GET(request);

    expect(response).toBe(authError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 200 ok when Supabase is reachable", async () => {
    mockVerifyCronAuth.mockReturnValue(null);
    mockFrom.mockImplementation(() =>
      buildChainMock({ data: [{ id: "fam-1" }], error: null })
    );

    const request = new NextRequest("http://localhost/api/keep-alive", {
      headers: { "x-vercel-cron": "true" },
    });
    const response = await GET(request);

    expect(response).toEqual({ body: { status: "ok" }, status: 200 });
    expect(mockFrom).toHaveBeenCalledWith("families");
  });

  it("returns 500 when Supabase query fails", async () => {
    mockVerifyCronAuth.mockReturnValue(null);
    mockFrom.mockImplementation(() =>
      buildChainMock({ data: null, error: { message: "Connection refused" } })
    );

    const request = new NextRequest("http://localhost/api/keep-alive", {
      headers: { "x-vercel-cron": "true" },
    });
    const response = await GET(request);

    expect(response).toEqual({
      body: { status: "error", message: "Connection refused" },
      status: 500,
    });
  });
});
