/**
 * Tests for settlement cron route
 * Tests GET and POST from app/api/cron/settlement/route.ts
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
      init?: { headers?: Record<string, string>; method?: string; body?: string }
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

const mockRpc = jest.fn();
const mockCreateAdminClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  createAdminClient: (...args: any[]) => mockCreateAdminClient(...args),
}));

const mockVerifyCronAuth = jest.fn();
jest.mock("@/lib/api/cron-auth", () => ({
  verifyCronAuth: (...args: any[]) => mockVerifyCronAuth(...args),
}));

import { GET, POST } from "@/app/api/cron/settlement/route";
const { NextRequest } = require("next/server");

describe("Settlement Cron Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyCronAuth.mockReturnValue(null); // authorized by default
    mockCreateAdminClient.mockReturnValue({ rpc: mockRpc });
  });

  describe("GET", () => {
    it("returns 401 when cron auth fails", async () => {
      const unauthorizedResponse = { body: { error: "Unauthorized" }, status: 401 };
      mockVerifyCronAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest("http://localhost/api/cron/settlement");
      const response = await GET(request);

      expect(response).toBe(unauthorizedResponse);
      expect(response.status).toBe(401);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("returns success when settlement RPC succeeds", async () => {
      mockRpc.mockResolvedValue({
        data: { families_processed: 2 },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/cron/settlement");
      const response = await GET(request);

      expect(response.body).toEqual({
        success: true,
        message: "Monthly settlement completed",
        result: { families_processed: 2 },
      });
      expect(response.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith("run_monthly_settlement", {
        p_settlement_date: null,
        p_family_id: null,
      });
    });

    it("returns 500 when RPC errors", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Settlement function failed" },
      });

      const request = new NextRequest("http://localhost/api/cron/settlement");
      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "Settlement failed",
        details: "Settlement function failed",
      });
    });

    it("passes date param from query string to RPC", async () => {
      mockRpc.mockResolvedValue({ data: {}, error: null });

      const request = new NextRequest(
        "http://localhost/api/cron/settlement?date=2025-06-01"
      );
      const response = await GET(request);

      expect(mockRpc).toHaveBeenCalledWith("run_monthly_settlement", {
        p_settlement_date: "2025-06-01",
        p_family_id: null,
      });
      expect(response.status).toBe(200);
    });

    it("passes family_id param from query string to RPC", async () => {
      mockRpc.mockResolvedValue({ data: {}, error: null });

      const request = new NextRequest(
        "http://localhost/api/cron/settlement?family_id=abc-123"
      );
      const response = await GET(request);

      expect(mockRpc).toHaveBeenCalledWith("run_monthly_settlement", {
        p_settlement_date: null,
        p_family_id: "abc-123",
      });
      expect(response.status).toBe(200);
    });

    it("passes both date and family_id params to RPC", async () => {
      mockRpc.mockResolvedValue({ data: {}, error: null });

      const request = new NextRequest(
        "http://localhost/api/cron/settlement?date=2025-06-01&family_id=fam-99"
      );
      const response = await GET(request);

      expect(mockRpc).toHaveBeenCalledWith("run_monthly_settlement", {
        p_settlement_date: "2025-06-01",
        p_family_id: "fam-99",
      });
      expect(response.status).toBe(200);
    });

    it("returns 500 on unexpected error", async () => {
      mockRpc.mockRejectedValue(new Error("Connection timeout"));

      const request = new NextRequest("http://localhost/api/cron/settlement");
      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal server error" });
    });
  });

  describe("POST", () => {
    it("delegates to GET", async () => {
      mockRpc.mockResolvedValue({
        data: { families_processed: 1 },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/cron/settlement", {
        method: "POST",
      });
      const response = await POST(request);

      expect(response.body).toEqual({
        success: true,
        message: "Monthly settlement completed",
        result: { families_processed: 1 },
      });
      expect(response.status).toBe(200);
    });
  });
});
