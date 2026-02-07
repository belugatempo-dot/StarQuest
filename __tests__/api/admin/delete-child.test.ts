/**
 * Tests for delete-child admin API route
 * Tests POST from app/[locale]/api/admin/delete-child/route.ts
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
const mockRpc = jest.fn();
const mockCreateClient = jest.fn();
const mockCreateAdminClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
  createAdminClient: (...args: any[]) => mockCreateAdminClient(...args),
}));

import { POST } from "@/app/[locale]/api/admin/delete-child/route";
const { NextRequest } = require("next/server");

function makeChain(finalResult: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(finalResult);
  chain.single = jest.fn().mockResolvedValue(finalResult);
  return chain;
}

function makeRequest(body: any) {
  return new NextRequest("http://localhost/en/api/admin/delete-child", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("Delete Child API Route", () => {
  let userChain: any;
  let adminChildChain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    userChain = makeChain({
      data: { id: "parent-1", role: "parent", family_id: "family-1" },
      error: null,
    });

    adminChildChain = makeChain({
      data: { id: "child-1", role: "child", family_id: "family-1" },
      error: null,
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: "parent-1" } },
    });

    mockFrom.mockReturnValue(userChain);

    const mockAdminFrom = jest.fn().mockReturnValue(adminChildChain);
    mockCreateAdminClient.mockReturnValue({ from: mockAdminFrom });

    mockRpc.mockResolvedValue({ data: true, error: null });

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
      rpc: mockRpc,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = makeRequest({ childId: "child-1" });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not parent", async () => {
    userChain.maybeSingle.mockResolvedValue({
      data: { id: "user-1", role: "child", family_id: "family-1" },
      error: null,
    });

    const request = makeRequest({ childId: "child-1" });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Forbidden - Parents only");
  });

  it("returns 400 when childId missing", async () => {
    const request = makeRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing childId");
  });

  it("returns 404 when child not found", async () => {
    adminChildChain.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = makeRequest({ childId: "nonexistent" });
    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Child not found or access denied");
  });

  it("returns 404 when child belongs to different family", async () => {
    adminChildChain.maybeSingle.mockResolvedValue({
      data: { id: "child-1", role: "child", family_id: "other-family" },
      error: null,
    });

    const request = makeRequest({ childId: "child-1" });
    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Child not found or access denied");
  });

  it("returns 500 when RPC throws", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Delete function failed" },
    });

    const request = makeRequest({ childId: "child-1" });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Delete function failed");
  });

  it("returns success on successful delete", async () => {
    const request = makeRequest({ childId: "child-1" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("admin_delete_child", {
      p_child_id: "child-1",
      p_parent_id: "parent-1",
    });
  });
});
