/**
 * Tests for POST /api/reports/generate-markdown
 */

// Mock next/server
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
      init?: { headers?: Record<string, string>; method?: string; body?: string }
    ) {
      this.url = url;
      this._headers = new MockHeaders(init?.headers);
      this.nextUrl = { searchParams: new URLSearchParams(new URL(url).search) };
      this._body = init?.body ? JSON.parse(init.body) : null;
    }
    get headers() { return this._headers; }
    async json() { return this._body; }
  }
  class MockNextResponse {
    status: number;
    body: any;
    _headers: Map<string, string>;
    constructor(body: any, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this._headers = new Map(Object.entries(init?.headers || {}));
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

const mockFetchReportBaseData = jest.fn();
const mockBuildChildrenStats = jest.fn();

jest.mock("@/lib/reports/report-utils", () => ({
  fetchReportBaseData: (...args: any[]) => mockFetchReportBaseData(...args),
  buildChildrenStats: (...args: any[]) => mockBuildChildrenStats(...args),
}));

const mockGenerateMarkdownReport = jest.fn();

jest.mock("@/lib/reports/markdown-formatter", () => ({
  generateMarkdownReport: (...args: any[]) => mockGenerateMarkdownReport(...args),
}));

import { POST } from "@/app/api/reports/generate-markdown/route";
const { NextRequest } = require("next/server");

function makeUserChain(userData: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(userData);
  return chain;
}

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/reports/generate-markdown", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validBody = {
  periodType: "weekly",
  periodStart: "2026-02-09T00:00:00.000Z",
  periodEnd: "2026-02-15T23:59:59.999Z",
  locale: "en",
};

describe("POST /api/reports/generate-markdown", () => {
  let userChain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    userChain = makeUserChain({
      data: { id: "parent-1", role: "parent", family_id: "family-1" },
      error: null,
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: "parent-1" } },
    });

    mockFrom.mockReturnValue(userChain);

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    mockFetchReportBaseData.mockResolvedValue({
      family: { id: "family-1", name: "Demo Family" },
      children: [{ id: "c1", name: "Emma" }],
      transactions: [],
      redemptions: [],
      balances: [],
      creditTx: [],
      pendingStars: [],
      pendingRedemptions: [],
    });

    mockBuildChildrenStats.mockReturnValue({
      childrenData: [
        {
          childId: "c1",
          name: "Emma",
          starsEarned: 80,
          starsSpent: 30,
          netStars: 50,
          currentBalance: 45,
          creditBorrowed: 0,
          creditRepaid: 0,
          topQuests: [],
          pendingRequestsCount: 0,
        },
      ],
      totalEarned: 80,
      totalSpent: 30,
    });

    mockGenerateMarkdownReport.mockReturnValue("# Report\n\nTest content");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a parent", async () => {
    userChain.maybeSingle.mockResolvedValue({
      data: { id: "child-1", role: "child", family_id: "family-1" },
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when periodType is missing", async () => {
    const body = { ...validBody, periodType: undefined };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when periodType is invalid", async () => {
    const body = { ...validBody, periodType: "biweekly" };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when periodStart is missing", async () => {
    const body = { ...validBody, periodStart: undefined };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when periodEnd is missing", async () => {
    const body = { ...validBody, periodEnd: undefined };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when dates are invalid", async () => {
    const body = { ...validBody, periodStart: "not-a-date" };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 500 when fetchReportBaseData returns null", async () => {
    mockFetchReportBaseData.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });

  it("calls fetchReportBaseData with correct args", async () => {
    await POST(makeRequest(validBody));

    expect(mockFetchReportBaseData).toHaveBeenCalledWith(
      "family-1",
      expect.any(Date),
      expect.any(Date)
    );

    const [, start, end] = mockFetchReportBaseData.mock.calls[0];
    expect(start.toISOString()).toBe("2026-02-09T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-02-15T23:59:59.999Z");
  });

  it("calls buildChildrenStats with raw data and locale", async () => {
    await POST(makeRequest(validBody));

    expect(mockBuildChildrenStats).toHaveBeenCalledWith(
      expect.objectContaining({ family: { id: "family-1", name: "Demo Family" } }),
      "en"
    );
  });

  it("calls generateMarkdownReport with assembled data", async () => {
    await POST(makeRequest(validBody));

    expect(mockGenerateMarkdownReport).toHaveBeenCalledWith(
      expect.objectContaining({
        familyName: "Demo Family",
        locale: "en",
        periodType: "weekly",
        totalEarned: 80,
        totalSpent: 30,
      })
    );
  });

  it("returns markdown content with correct headers on success", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(res._headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(res._headers.get("Content-Disposition")).toContain("attachment");
    expect(res._headers.get("Content-Disposition")).toContain(".md");
  });

  it("returns the generated markdown in the response body", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.body).toBe("# Report\n\nTest content");
  });

  it("fetches previous period data for comparison (non-daily)", async () => {
    await POST(makeRequest(validBody));

    // fetchReportBaseData should be called twice: once for current, once for previous
    expect(mockFetchReportBaseData).toHaveBeenCalledTimes(2);
  });

  it("skips previous period for daily reports", async () => {
    await POST(makeRequest({ ...validBody, periodType: "daily" }));

    // Only called once for daily (no comparison)
    expect(mockFetchReportBaseData).toHaveBeenCalledTimes(1);
  });

  it("handles previous period fetch returning null gracefully", async () => {
    mockFetchReportBaseData
      .mockResolvedValueOnce({
        family: { id: "family-1", name: "Demo Family" },
        children: [{ id: "c1", name: "Emma" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      })
      .mockResolvedValueOnce(null); // previous period fails

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    // Should still work, just without comparison
    expect(mockGenerateMarkdownReport).toHaveBeenCalledWith(
      expect.objectContaining({ previousPeriod: undefined })
    );
  });

  it("defaults locale to en when not provided", async () => {
    const body = { ...validBody, locale: undefined };
    await POST(makeRequest(body));

    expect(mockBuildChildrenStats).toHaveBeenCalledWith(
      expect.anything(),
      "en"
    );
  });

  it("passes zh-CN locale through", async () => {
    await POST(makeRequest({ ...validBody, locale: "zh-CN" }));

    expect(mockBuildChildrenStats).toHaveBeenCalledWith(
      expect.anything(),
      "zh-CN"
    );
  });

  it("returns 403 when user has no family_id", async () => {
    userChain.maybeSingle.mockResolvedValue({
      data: { id: "parent-1", role: "parent", family_id: null },
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });
});
