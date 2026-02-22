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

const mockSaveDemoSnapshot = jest.fn();
const mockRestoreDemoData = jest.fn();
const mockGetSnapshotLatestDate = jest.fn();
jest.mock("@/lib/demo/demo-snapshot", () => ({
  saveDemoSnapshot: (...args: unknown[]) => mockSaveDemoSnapshot(...args),
  restoreDemoData: (...args: unknown[]) => mockRestoreDemoData(...args),
  getSnapshotLatestDate: (...args: unknown[]) => mockGetSnapshotLatestDate(...args),
}));

// ---- Import route (after mocks) ----
import { POST } from "@/app/api/seed-demo/route";

function createRequest(
  headers: Record<string, string> = {},
  url = "https://example.com/api/seed-demo"
) {
  return {
    url,
    headers: new Map(Object.entries(headers)),
  } as any;
}

const AUTH_HEADER = { authorization: "Bearer test-secret-that-is-long-enough-32" };

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
      const result = await POST(createRequest(AUTH_HEADER));
      expect(result.status).toBe(500);
      expect(result.body.error).toBe("Service role key required");
    });
  });

  // -- Default mode: full seed + snapshot --
  describe("default mode (full seed)", () => {
    it("cleans up, seeds, saves snapshot, returns credentials", async () => {
      mockCleanupDemoFamily.mockResolvedValue({
        found: true,
        familyId: "old-fam",
        deletedAuthUsers: 3,
      });
      mockSeedDemoFamily.mockResolvedValue({
        familyId: "fam-1",
        parentId: "parent-1",
        children: [
          { name: "Alisa", email: "alisa.demo@starquest.app", password: "AlisaDemo123!", userId: "child-1" },
          { name: "Alexander", email: "alexander.demo@starquest.app", password: "AlexanderDemo123!", userId: "child-2" },
        ],
        stats: { transactions: 200, redemptions: 7, days: 30 },
      });
      mockSaveDemoSnapshot.mockResolvedValue(undefined);

      const result = await POST(createRequest(AUTH_HEADER));

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.family.id).toBe("fam-1");
      expect(result.body.credentials.parent.email).toBe("demo@starquest.app");
      expect(result.body.credentials.children).toHaveLength(2);
      expect(result.body.credentials.children[0].name).toBe("Alisa");
      expect(result.body.stats.transactions).toBe(200);

      // Verify call order: cleanup → seed → save snapshot
      expect(mockCleanupDemoFamily).toHaveBeenCalledWith(mockAdminClient);
      expect(mockSeedDemoFamily).toHaveBeenCalledWith(mockAdminClient);
      expect(mockSaveDemoSnapshot).toHaveBeenCalledWith(mockAdminClient, "fam-1");
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
      mockSaveDemoSnapshot.mockResolvedValue(undefined);

      const result = await POST(createRequest(AUTH_HEADER));

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(mockSaveDemoSnapshot).toHaveBeenCalledWith(mockAdminClient, "fam-new");
    });
  });

  // -- Extend mode --
  describe("extend mode", () => {
    const extendUrl = "https://example.com/api/seed-demo?mode=extend";

    it("restores snapshot, seeds gap, saves new snapshot", async () => {
      mockRestoreDemoData.mockResolvedValue(undefined);
      mockGetSnapshotLatestDate.mockResolvedValue(
        new Date("2026-01-20T14:00:00Z")
      );
      mockSeedDemoFamily.mockResolvedValue({
        familyId: "fam-1",
        parentId: "parent-1",
        children: [],
        stats: { transactions: 50, redemptions: 2, days: 10 },
      });
      mockSaveDemoSnapshot.mockResolvedValue(undefined);

      const result = await POST(createRequest(AUTH_HEADER, extendUrl));

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.mode).toBe("extend");
      expect(result.body.stats.transactions).toBe(50);

      expect(mockRestoreDemoData).toHaveBeenCalledWith(mockAdminClient);
      expect(mockGetSnapshotLatestDate).toHaveBeenCalledWith(mockAdminClient);

      // Verify seed was called with startDate = latestDate + 1 day
      const seedCall = mockSeedDemoFamily.mock.calls[0];
      expect(seedCall[0]).toBe(mockAdminClient);
      expect(seedCall[1].startDate).toEqual(
        new Date("2026-01-21T14:00:00Z")
      );
      expect(seedCall[1].endDate).toBeInstanceOf(Date);

      expect(mockSaveDemoSnapshot).toHaveBeenCalledWith(mockAdminClient, "fam-1");
    });

    it("returns 400 when no snapshot exists", async () => {
      mockRestoreDemoData.mockResolvedValue(undefined);
      mockGetSnapshotLatestDate.mockResolvedValue(null);

      const result = await POST(createRequest(AUTH_HEADER, extendUrl));

      expect(result.status).toBe(400);
      expect(result.body.error).toMatch(/no snapshot/i);
    });

    it("returns success when snapshot is already up to date", async () => {
      mockRestoreDemoData.mockResolvedValue(undefined);
      // Latest date is now (no gap to fill)
      mockGetSnapshotLatestDate.mockResolvedValue(new Date());

      const result = await POST(createRequest(AUTH_HEADER, extendUrl));

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.message).toMatch(/up to date/i);
      expect(mockSeedDemoFamily).not.toHaveBeenCalled();
    });

    it("does not call cleanup in extend mode", async () => {
      mockRestoreDemoData.mockResolvedValue(undefined);
      mockGetSnapshotLatestDate.mockResolvedValue(
        new Date("2026-01-15T00:00:00Z")
      );
      mockSeedDemoFamily.mockResolvedValue({
        familyId: "fam-1",
        parentId: "p",
        children: [],
        stats: { transactions: 10, redemptions: 0, days: 5 },
      });
      mockSaveDemoSnapshot.mockResolvedValue(undefined);

      await POST(createRequest(AUTH_HEADER, extendUrl));

      expect(mockCleanupDemoFamily).not.toHaveBeenCalled();
    });
  });

  // -- Error handling --
  describe("error handling", () => {
    it("returns 500 when cleanup throws", async () => {
      mockCleanupDemoFamily.mockRejectedValue(new Error("DB connection lost"));

      const result = await POST(createRequest(AUTH_HEADER));

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

      const result = await POST(createRequest(AUTH_HEADER));

      expect(result.status).toBe(500);
      expect(result.body.details).toBe("RPC timeout");
    });

    it("returns 500 when snapshot save throws in default mode", async () => {
      mockCleanupDemoFamily.mockResolvedValue({ found: false, familyId: null, deletedAuthUsers: 0 });
      mockSeedDemoFamily.mockResolvedValue({
        familyId: "fam-1",
        parentId: "p",
        children: [],
        stats: { transactions: 10, redemptions: 0, days: 5 },
      });
      mockSaveDemoSnapshot.mockRejectedValue(new Error("Snapshot save failed"));

      const result = await POST(createRequest(AUTH_HEADER));

      expect(result.status).toBe(500);
      expect(result.body.details).toBe("Snapshot save failed");
    });

    it("returns 500 when restore throws in extend mode", async () => {
      mockRestoreDemoData.mockRejectedValue(new Error("Restore failed"));

      const result = await POST(
        createRequest(AUTH_HEADER, "https://example.com/api/seed-demo?mode=extend")
      );

      expect(result.status).toBe(500);
      expect(result.body.details).toBe("Restore failed");
    });

    it("handles non-Error throws", async () => {
      mockCleanupDemoFamily.mockRejectedValue("string error");

      const result = await POST(createRequest(AUTH_HEADER));

      expect(result.status).toBe(500);
      expect(result.body.details).toBe("string error");
    });
  });
});
