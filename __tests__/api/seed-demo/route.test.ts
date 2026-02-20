/**
 * Tests for app/api/seed-demo/route.ts
 */

// ---- Mock next/server ----
jest.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    headers: Map<string, string>;
    constructor(url: string, opts?: { headers?: Record<string, string> }) {
      this.url = url;
      this.headers = new Map(Object.entries(opts?.headers || {}));
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
const mockAdminClient = { mock: true };
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
import { POST } from "@/app/api/seed-demo/route";

function createRequest(headers: Record<string, string> = {}) {
  return {
    url: "https://example.com/api/seed-demo",
    headers: new Map(Object.entries(headers)),
  } as any;
}

// ---- Test suite ----
describe("POST /api/seed-demo", () => {
  const originalEnv = process.env;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    process.env = {
      ...originalEnv,
      DEMO_SEED_SECRET: "test-secret-that-is-long-enough-32",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      DEMO_PARENT_PASSWORD: "TestParentPass123!",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // -- Authentication tests --
  describe("authentication", () => {
    it("returns 401 when no authorization header", async () => {
      const result = await POST(createRequest());
      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Unauthorized");
    });

    it("returns 401 when secret is wrong", async () => {
      const result = await POST(
        createRequest({ authorization: "Bearer wrong-secret" })
      );
      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Unauthorized");
    });

    it("returns 401 when DEMO_SEED_SECRET is not configured", async () => {
      delete process.env.DEMO_SEED_SECRET;
      const result = await POST(
        createRequest({ authorization: "Bearer some-secret" })
      );
      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Unauthorized");
    });

    it("returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const result = await POST(
        createRequest({
          authorization: "Bearer test-secret-that-is-long-enough-32",
        })
      );
      expect(result.status).toBe(500);
      expect(result.body.error).toBe("Service role key required");
    });
  });

  // -- Successful seed --
  describe("successful seed", () => {
    it("cleans up and seeds demo family, returns credentials", async () => {
      mockCleanupDemoFamily.mockResolvedValue({
        found: true,
        familyId: "old-fam",
        deletedAuthUsers: 3,
      });

      mockSeedDemoFamily.mockResolvedValue({
        familyId: "fam-1",
        parentId: "parent-1",
        children: [
          {
            name: "Alisa",
            email: "alisa.demo@starquest.app",
            password: "AlisaDemo123!",
            userId: "child-1",
          },
          {
            name: "Alexander",
            email: "alexander.demo@starquest.app",
            password: "AlexanderDemo123!",
            userId: "child-2",
          },
        ],
        stats: { transactions: 200, redemptions: 7, days: 30 },
      });

      const result = await POST(
        createRequest({
          authorization: "Bearer test-secret-that-is-long-enough-32",
        })
      );

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.family.id).toBe("fam-1");
      expect(result.body.credentials.parent.email).toBe("demo@starquest.app");
      expect(result.body.credentials.children).toHaveLength(2);
      expect(result.body.credentials.children[0].name).toBe("Alisa");
      expect(result.body.stats.transactions).toBe(200);

      // Verify cleanup was called with admin client
      expect(mockCleanupDemoFamily).toHaveBeenCalledWith(mockAdminClient);
      // Verify seed was called with admin client
      expect(mockSeedDemoFamily).toHaveBeenCalledWith(mockAdminClient);
    });

    it("works when no existing demo family (first run)", async () => {
      mockCleanupDemoFamily.mockResolvedValue({
        found: false,
        familyId: null,
        deletedAuthUsers: 0,
      });

      mockSeedDemoFamily.mockResolvedValue({
        familyId: "fam-new",
        parentId: "parent-new",
        children: [],
        stats: { transactions: 100, redemptions: 5, days: 30 },
      });

      const result = await POST(
        createRequest({
          authorization: "Bearer test-secret-that-is-long-enough-32",
        })
      );

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
    });
  });

  // -- Error handling --
  describe("error handling", () => {
    it("returns 500 when cleanup throws", async () => {
      mockCleanupDemoFamily.mockRejectedValue(new Error("DB connection lost"));

      const result = await POST(
        createRequest({
          authorization: "Bearer test-secret-that-is-long-enough-32",
        })
      );

      expect(result.status).toBe(500);
      expect(result.body.error).toBe("Seed failed");
      expect(result.body.details).toBe("DB connection lost");
    });

    it("returns 500 when seed throws", async () => {
      mockCleanupDemoFamily.mockResolvedValue({
        found: false,
        familyId: null,
        deletedAuthUsers: 0,
      });
      mockSeedDemoFamily.mockRejectedValue(new Error("RPC timeout"));

      const result = await POST(
        createRequest({
          authorization: "Bearer test-secret-that-is-long-enough-32",
        })
      );

      expect(result.status).toBe(500);
      expect(result.body.details).toBe("RPC timeout");
    });

    it("handles non-Error throws", async () => {
      mockCleanupDemoFamily.mockRejectedValue("string error");

      const result = await POST(
        createRequest({
          authorization: "Bearer test-secret-that-is-long-enough-32",
        })
      );

      expect(result.status).toBe(500);
      expect(result.body.details).toBe("string error");
    });
  });
});
