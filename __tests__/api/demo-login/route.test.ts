/**
 * Tests for POST /api/demo-login — passwordless demo login via Admin generateLink.
 * Includes auto-reset: cleanup + seed demo data before each login.
 */

// ---- Mock next/server ----
jest.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    headers: Map<string, string>;
    private _body: string | undefined;
    constructor(url: string, opts?: { headers?: Record<string, string>; body?: string }) {
      this.url = url;
      this.headers = new Map(Object.entries(opts?.headers || {}));
      this._body = opts?.body;
    }
    async json() {
      if (!this._body) throw new Error("No body");
      return JSON.parse(this._body);
    }
  }
  class MockNextResponse {
    static json(body: unknown, init?: { status?: number }) {
      return { body, status: init?.status || 200 };
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

// ---- Mock @/lib/supabase/server ----
const mockGenerateLink = jest.fn();
const mockAdminClient = {
  auth: { admin: { generateLink: mockGenerateLink } },
};
jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockAdminClient,
}));

// ---- Mock demo modules ----
const mockCleanupDemoFamily = jest.fn();
jest.mock("@/lib/demo/demo-cleanup", () => ({
  cleanupDemoFamily: (...args: unknown[]) => mockCleanupDemoFamily(...args),
}));

const mockSeedDemoFamily = jest.fn();
jest.mock("@/lib/demo/demo-seed", () => ({
  seedDemoFamily: (...args: unknown[]) => mockSeedDemoFamily(...args),
}));

// ---- Import route (after mocks) ----
import { POST } from "@/app/api/demo-login/route";

function createRequest(body?: Record<string, unknown>) {
  return {
    url: "https://example.com/api/demo-login",
    headers: new Map(),
    json: body ? async () => body : async () => { throw new Error("No body"); },
  } as any;
}

// ---- Test suite ----
describe("POST /api/demo-login", () => {
  const originalEnv = process.env;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    process.env = {
      ...originalEnv,
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    };

    // Default successful cleanup + seed
    mockCleanupDemoFamily.mockResolvedValue({
      found: true,
      familyId: "old-fam",
      deletedAuthUsers: 3,
    });
    mockSeedDemoFamily.mockResolvedValue({
      familyId: "fam-1",
      parentId: "parent-1",
      children: [],
      stats: { transactions: 100, redemptions: 5, days: 30 },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  // -- Validation tests (unchanged behavior) --
  it("returns 503 when SUPABASE_SERVICE_ROLE_KEY is not set", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await POST(createRequest({ role: "parent" }));
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "Demo login not available" });
  });

  it("returns 400 when request body is missing", async () => {
    const req = {
      url: "https://example.com/api/demo-login",
      headers: new Map(),
      json: async () => { throw new Error("No body"); },
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid request body" });
  });

  it("returns 400 when role is missing from body", async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
  });

  it("returns 400 for invalid role", async () => {
    const res = await POST(createRequest({ role: "hacker" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
  });

  // -- Successful login with auto-reset --
  it("returns 200 with token_hash for parent role", async () => {
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: "tok_parent_abc" } },
      error: null,
    });

    const res = await POST(createRequest({ role: "parent" }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      token_hash: "tok_parent_abc",
      email: "demo@starquest.app",
    });
    expect(mockGenerateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "demo@starquest.app",
    });
  });

  it("returns 200 with correct email for alisa role", async () => {
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: "tok_alisa_abc" } },
      error: null,
    });

    const res = await POST(createRequest({ role: "alisa" }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      token_hash: "tok_alisa_abc",
      email: "alisa.demo@starquest.app",
    });
  });

  it("returns 200 with correct email for alexander role", async () => {
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: "tok_alexander_abc" } },
      error: null,
    });

    const res = await POST(createRequest({ role: "alexander" }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      token_hash: "tok_alexander_abc",
      email: "alexander.demo@starquest.app",
    });
  });

  it("returns 500 when generateLink returns an error", async () => {
    mockGenerateLink.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });

    const res = await POST(createRequest({ role: "parent" }));
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to generate demo login token" });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("returns 500 when generateLink returns no hashed_token", async () => {
    mockGenerateLink.mockResolvedValue({
      data: { properties: {} },
      error: null,
    });

    const res = await POST(createRequest({ role: "parent" }));
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to generate demo login token" });
  });

  // -- Auto-reset behavior --
  describe("auto-reset demo data", () => {
    it("calls cleanup then seed before generateLink", async () => {
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "tok_abc" } },
        error: null,
      });

      const callOrder: string[] = [];
      mockCleanupDemoFamily.mockImplementation(async () => {
        callOrder.push("cleanup");
        return { found: true, familyId: "old", deletedAuthUsers: 3 };
      });
      mockSeedDemoFamily.mockImplementation(async () => {
        callOrder.push("seed");
        return { familyId: "new", parentId: "p", children: [], stats: {} };
      });
      mockGenerateLink.mockImplementation(async () => {
        callOrder.push("generateLink");
        return { data: { properties: { hashed_token: "tok_abc" } }, error: null };
      });

      await POST(createRequest({ role: "parent" }));

      expect(callOrder).toEqual(["cleanup", "seed", "generateLink"]);
    });

    it("passes adminClient to cleanup and seed", async () => {
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "tok_abc" } },
        error: null,
      });

      await POST(createRequest({ role: "parent" }));

      expect(mockCleanupDemoFamily).toHaveBeenCalledWith(mockAdminClient);
      expect(mockSeedDemoFamily).toHaveBeenCalledWith(mockAdminClient);
    });

    it("logs success when cleanup and seed succeed", async () => {
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "tok_abc" } },
        error: null,
      });

      await POST(createRequest({ role: "parent" }));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Demo data reset")
      );
    });

    it("still returns 200 when cleanup throws (race condition)", async () => {
      mockCleanupDemoFamily.mockRejectedValue(new Error("Concurrent cleanup"));
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "tok_abc" } },
        error: null,
      });

      const res = await POST(createRequest({ role: "parent" }));

      expect(res.status).toBe(200);
      expect(res.body.token_hash).toBe("tok_abc");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Demo data reset failed"),
        expect.any(String)
      );
    });

    it("still returns 200 when seed throws (race condition)", async () => {
      mockSeedDemoFamily.mockRejectedValue(new Error("Duplicate key"));
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "tok_abc" } },
        error: null,
      });

      const res = await POST(createRequest({ role: "parent" }));

      expect(res.status).toBe(200);
      expect(res.body.token_hash).toBe("tok_abc");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Demo data reset failed"),
        expect.any(String)
      );
    });

    it("does not call cleanup/seed when role is invalid", async () => {
      await POST(createRequest({ role: "hacker" }));

      expect(mockCleanupDemoFamily).not.toHaveBeenCalled();
      expect(mockSeedDemoFamily).not.toHaveBeenCalled();
    });

    it("does not call cleanup/seed when service key is missing", async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      await POST(createRequest({ role: "parent" }));

      expect(mockCleanupDemoFamily).not.toHaveBeenCalled();
      expect(mockSeedDemoFamily).not.toHaveBeenCalled();
    });
  });
});
