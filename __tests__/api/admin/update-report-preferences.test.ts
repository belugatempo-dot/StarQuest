/**
 * Tests for update-report-preferences admin API route
 * Tests POST from app/[locale]/api/admin/update-report-preferences/route.ts
 */

// Mock next/server before any imports
jest.mock("next/server", () => {
  class MockHeaders {
    private _headers: Map<string, string>;
    constructor(init?: Record<string, string>) {
      this._headers = new Map(Object.entries(init || {}));
    }
    get(name: string) {
      return this._headers.get(name) || null;
    }
  }
  class MockNextRequest {
    private _headers: MockHeaders;
    url: string;
    nextUrl: { searchParams: URLSearchParams };
    _body: any;
    constructor(
      url: string,
      init?: {
        headers?: Record<string, string>;
        method?: string;
        body?: string;
      }
    ) {
      this.url = url;
      this._headers = new MockHeaders(init?.headers);
      this.nextUrl = {
        searchParams: new URLSearchParams(new URL(url).search),
      };
      this._body = init?.body ? JSON.parse(init.body) : null;
    }
    get headers() {
      return this._headers;
    }
    async json() {
      return this._body;
    }
  }
  class MockNextResponse {
    status: number;
    body: any;
    constructor(body: any, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status || 200;
    }
    static json(body: any, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();
const mockCreateAdminClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
  createAdminClient: (...args: any[]) => mockCreateAdminClient(...args),
}));

import { POST } from "@/app/[locale]/api/admin/update-report-preferences/route";
const { NextRequest } = require("next/server");

function makeChain(finalResult: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(finalResult);
  return chain;
}

function makeRequest(body: any) {
  return new NextRequest(
    "http://localhost/en/api/admin/update-report-preferences",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

const validBody = {
  familyId: "family-1",
  reportEmail: "reports@example.com",
  weeklyReportEnabled: true,
  monthlyReportEnabled: false,
  settlementEmailEnabled: true,
  timezone: "Asia/Shanghai",
  reportLocale: "zh-CN",
};

describe("Update Report Preferences API Route", () => {
  let userChain: any;
  let mockAdminUpsert: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    userChain = makeChain({
      data: { id: "parent-1", role: "parent", family_id: "family-1" },
      error: null,
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: "parent-1" } },
    });

    mockFrom.mockReturnValue(userChain);

    mockAdminUpsert = jest.fn().mockResolvedValue({ error: null });
    const mockAdminFrom = jest.fn().mockReturnValue({
      upsert: mockAdminUpsert,
    });
    mockCreateAdminClient.mockReturnValue({ from: mockAdminFrom });

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = makeRequest(validBody);
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not parent", async () => {
    userChain.maybeSingle.mockResolvedValue({
      data: { id: "user-1", role: "child", family_id: "family-1" },
      error: null,
    });

    const request = makeRequest(validBody);
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Forbidden - Parents only");
  });

  it("returns 403 when user has no profile", async () => {
    userChain.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = makeRequest(validBody);
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Forbidden - Parents only");
  });

  it("returns 400 when familyId missing", async () => {
    const request = makeRequest({ ...validBody, familyId: undefined });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing familyId");
  });

  it("returns 403 when familyId does not match user family", async () => {
    const request = makeRequest({ ...validBody, familyId: "other-family" });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Family mismatch");
  });

  it("upserts preferences and returns success", async () => {
    const request = makeRequest(validBody);
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockAdminUpsert).toHaveBeenCalledWith(
      {
        family_id: "family-1",
        report_email: "reports@example.com",
        weekly_report_enabled: true,
        monthly_report_enabled: false,
        settlement_email_enabled: true,
        timezone: "Asia/Shanghai",
        report_locale: "zh-CN",
      },
      { onConflict: "family_id" }
    );
  });

  it("sends null for empty reportEmail", async () => {
    const request = makeRequest({ ...validBody, reportEmail: "" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockAdminUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ report_email: null }),
      expect.any(Object)
    );
  });

  it("sends null for null reportEmail", async () => {
    const request = makeRequest({ ...validBody, reportEmail: null });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockAdminUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ report_email: null }),
      expect.any(Object)
    );
  });

  it("uses defaults for missing optional fields", async () => {
    const request = makeRequest({ familyId: "family-1" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockAdminUpsert).toHaveBeenCalledWith(
      {
        family_id: "family-1",
        report_email: null,
        weekly_report_enabled: true,
        monthly_report_enabled: true,
        settlement_email_enabled: true,
        timezone: "UTC",
        report_locale: "en",
      },
      { onConflict: "family_id" }
    );
  });

  it("returns 500 when upsert fails", async () => {
    mockAdminUpsert.mockResolvedValue({
      error: { message: "Database error" },
    });

    const request = makeRequest(validBody);
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Database error");
  });

  it("returns 500 with default message for error without message", async () => {
    mockAdminUpsert.mockResolvedValue({
      error: {},
    });

    const request = makeRequest(validBody);
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to save preferences");
  });
});
