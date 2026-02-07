import { verifyCronAuth } from "@/lib/api/cron-auth";

// Mock next/server for jsdom environment
jest.mock("next/server", () => {
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

  class MockNextRequest {
    private _headers: Map<string, string>;
    url: string;
    constructor(url: string, init?: { headers?: Record<string, string> }) {
      this.url = url;
      this._headers = new Map(
        Object.entries(init?.headers || {})
      );
    }
    get headers() {
      const headers = this._headers;
      return {
        get: (name: string) => headers.get(name) || null,
      };
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

// Re-import after mock
const { NextRequest } = require("next/server");

describe("verifyCronAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null (authorized) when x-vercel-cron header is 'true'", () => {
    const request = new NextRequest("https://example.com/api/cron/test", {
      headers: { "x-vercel-cron": "true" },
    });
    expect(verifyCronAuth(request)).toBeNull();
  });

  it("returns null when authorization header matches CRON_SECRET", () => {
    process.env.CRON_SECRET = "my-secret";
    const request = new NextRequest("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer my-secret" },
    });
    expect(verifyCronAuth(request)).toBeNull();
  });

  it("returns 401 when no auth headers present", () => {
    process.env.CRON_SECRET = "my-secret";
    const request = new NextRequest("https://example.com/api/cron/test");
    const response = verifyCronAuth(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it("returns 401 when authorization header has wrong secret", () => {
    process.env.CRON_SECRET = "my-secret";
    const request = new NextRequest("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const response = verifyCronAuth(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET is not set and no vercel header", () => {
    delete process.env.CRON_SECRET;
    const request = new NextRequest("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer something" },
    });
    const response = verifyCronAuth(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it("prefers x-vercel-cron header over authorization", () => {
    process.env.CRON_SECRET = "my-secret";
    const request = new NextRequest("https://example.com/api/cron/test", {
      headers: {
        "x-vercel-cron": "true",
        authorization: "Bearer wrong-secret",
      },
    });
    expect(verifyCronAuth(request)).toBeNull();
  });
});
