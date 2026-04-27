/**
 * Tests for POST /api/reports/generate-csv
 */

jest.mock("next/server", () => {
  class MockHeaders {
    private _headers: Map<string, string>;
    constructor(init?: Record<string, string>) {
      this._headers = new Map(Object.entries(init || {}));
    }
    get(name: string) { return this._headers.get(name) || null; }
  }
  class MockNextRequest {
    private _headers: MockHeaders;
    url: string;
    nextUrl: { searchParams: URLSearchParams };
    _body: any;
    constructor(url: string, init?: { headers?: Record<string, string>; method?: string; body?: string }) {
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

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
  createAdminClient: jest.fn(),
}));

const mockFetchReportBaseData = jest.fn();

jest.mock("@/lib/reports/report-utils", () => ({
  fetchReportBaseData: (...args: any[]) => mockFetchReportBaseData(...args),
  buildChildrenStats: jest.fn(),
}));

const mockGenerateCsvReport = jest.fn();

jest.mock("@/lib/reports/csv-formatter", () => ({
  generateCsvReport: (...args: any[]) => mockGenerateCsvReport(...args),
}));

import { POST } from "@/app/api/reports/generate-csv/route";
const { NextRequest } = require("next/server");

function makeUserChain(userData: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(userData);
  return chain;
}

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/reports/generate-csv", {
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

describe("POST /api/reports/generate-csv", () => {
  let userChain: any;

  beforeEach(() => {
    jest.clearAllMocks();
    userChain = makeUserChain({
      data: { id: "parent-1", role: "parent", family_id: "family-1" },
      error: null,
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: "parent-1" } } });
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
    mockGenerateCsvReport.mockReturnValue("Date,Time,Child,Type,Name,Stars,Status\n2026-02-10,10:30,Emma,star,Read,5,approved");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not parent", async () => {
    userChain.maybeSingle.mockResolvedValue({
      data: { id: "child-1", role: "child", family_id: "family-1" },
      error: null,
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 403 when user has no family_id", async () => {
    userChain.maybeSingle.mockResolvedValue({
      data: { id: "parent-1", role: "parent", family_id: null },
      error: null,
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing periodType", async () => {
    const res = await POST(makeRequest({ ...validBody, periodType: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid periodType", async () => {
    const res = await POST(makeRequest({ ...validBody, periodType: "biweekly" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing dates", async () => {
    const res = await POST(makeRequest({ ...validBody, periodStart: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid dates", async () => {
    const res = await POST(makeRequest({ ...validBody, periodStart: "not-a-date" }));
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

  it("calls generateCsvReport with raw data and locale", async () => {
    await POST(makeRequest(validBody));
    expect(mockGenerateCsvReport).toHaveBeenCalledWith(
      expect.objectContaining({ family: { id: "family-1", name: "Demo Family" } }),
      "en"
    );
  });

  it("returns CSV with correct headers", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(res._headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res._headers.get("Content-Disposition")).toContain(".csv");
  });

  it("passes zh-CN locale through", async () => {
    await POST(makeRequest({ ...validBody, locale: "zh-CN" }));
    expect(mockGenerateCsvReport).toHaveBeenCalledWith(expect.anything(), "zh-CN");
  });

  it("defaults locale to en when not provided", async () => {
    await POST(makeRequest({ ...validBody, locale: undefined }));
    expect(mockGenerateCsvReport).toHaveBeenCalledWith(expect.anything(), "en");
  });

  it("returns CSV content in response body", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.body).toContain("Date,Time,Child");
  });

  it("uses .csv extension in filename", async () => {
    const res = await POST(makeRequest(validBody));
    const disposition = res._headers.get("Content-Disposition");
    expect(disposition).toMatch(/\.csv"/);
    expect(disposition).not.toMatch(/\.md/);
  });
});
