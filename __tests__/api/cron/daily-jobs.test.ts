/**
 * Tests for daily-jobs cron endpoint (app/api/cron/daily-jobs/route.ts)
 *
 * Covers: GET handler, POST handler, runSettlementIfDue, sendSettlementNotification,
 * runWeeklyReports, runMonthlyReports, getReportEmail
 */

// ---- Mock next/server (must be before imports) ----
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

// ---- Mock @/lib/api/cron-auth ----
const mockVerifyCronAuth = jest.fn();
jest.mock("@/lib/api/cron-auth", () => ({
  verifyCronAuth: (...args: any[]) => mockVerifyCronAuth(...args),
}));

// ---- Mock @/lib/supabase/server ----
const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  }),
}));

// ---- Mock email service ----
const mockSendEmail = jest.fn();
const mockIsEmailServiceAvailable = jest.fn();
jest.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  isEmailServiceAvailable: () => mockIsEmailServiceAvailable(),
}));

// ---- Mock report generators ----
const mockGenerateWeeklyReportData = jest.fn();
const mockGenerateMonthlyReportData = jest.fn();
jest.mock("@/lib/reports/generate-weekly", () => ({
  generateWeeklyReportData: (...args: any[]) =>
    mockGenerateWeeklyReportData(...args),
  getWeekBounds: () => ({
    weekStart: new Date("2025-01-13"),
    weekEnd: new Date("2025-01-19"),
  }),
}));
jest.mock("@/lib/reports/generate-monthly", () => ({
  generateMonthlyReportData: (...args: any[]) =>
    mockGenerateMonthlyReportData(...args),
  getMonthBounds: () => ({
    monthStart: new Date("2025-01-01"),
    monthEnd: new Date("2025-01-31"),
  }),
}));

// ---- Mock email templates ----
const mockGenerateWeeklyReportHtml = jest.fn().mockReturnValue("<html>weekly</html>");
const mockGetWeeklyReportSubject = jest.fn().mockReturnValue("Weekly Report");
jest.mock("@/lib/email/templates/weekly-report", () => ({
  generateWeeklyReportHtml: (...args: any[]) => mockGenerateWeeklyReportHtml(...args),
  getWeeklyReportSubject: (...args: any[]) => mockGetWeeklyReportSubject(...args),
}));
const mockGenerateMonthlyReportHtml = jest.fn().mockReturnValue("<html>monthly</html>");
const mockGetMonthlyReportSubject = jest.fn().mockReturnValue("Monthly Report");
jest.mock("@/lib/email/templates/monthly-report", () => ({
  generateMonthlyReportHtml: (...args: any[]) => mockGenerateMonthlyReportHtml(...args),
  getMonthlyReportSubject: (...args: any[]) => mockGetMonthlyReportSubject(...args),
}));
const mockGenerateSettlementNoticeHtml = jest.fn().mockReturnValue("<html>settlement</html>");
const mockGetSettlementNoticeSubject = jest.fn().mockReturnValue("Settlement Notice");
jest.mock("@/lib/email/templates/settlement-notice", () => ({
  generateSettlementNoticeHtml: (...args: any[]) => mockGenerateSettlementNoticeHtml(...args),
  getSettlementNoticeSubject: (...args: any[]) => mockGetSettlementNoticeSubject(...args),
}));

// ---- Chain mock helper ----
function makeChain(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.lte = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.or = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  chain.insert = jest.fn().mockResolvedValue({ error: null });
  chain.update = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue(resolvedValue);
  // Make the chain itself thenable so `await chain` resolves to resolvedValue
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return chain;
}

// ---- Import the route (after mocks) ----
import { GET, POST } from "@/app/api/cron/daily-jobs/route";

// ---- Helper to create a fake request ----
function createRequest() {
  return {
    url: "https://example.com/api/cron/daily-jobs",
    headers: new Map([["authorization", "Bearer test"]]),
  } as any;
}

// ---- Test suite ----
describe("Daily Jobs Cron Route", () => {
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    // Default: auth passes
    mockVerifyCronAuth.mockReturnValue(null);
    // Default: email service available
    mockIsEmailServiceAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  // ============================================================
  // Helper: set up a controlled date via fake timers
  // ============================================================
  function setFakeDate(date: Date) {
    jest.useFakeTimers();
    jest.setSystemTime(date);
  }

  // ============================================================
  // Helper: configure mockFrom to return different chains per table
  // ============================================================
  function setupFromMock(tableMap: Record<string, any>) {
    mockFrom.mockImplementation((table: string) => {
      if (tableMap[table]) return tableMap[table];
      // Default chain that resolves to no data
      return makeChain({ data: null, error: null });
    });
  }

  // ==================================================================
  // GET handler tests
  // ==================================================================
  describe("GET handler", () => {
    it("returns 401 when cron auth fails", async () => {
      mockVerifyCronAuth.mockReturnValue({ body: { error: "Unauthorized" }, status: 401 });

      const result = await GET(createRequest());
      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Unauthorized");
    });

    it("returns success with settlement results on non-Sunday, non-settlement day", async () => {
      // Wednesday, Jan 15, 2025 — not Sunday, not last day of month
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      // No families due for settlement (todayDay = 15)
      const familiesChain = makeChain({ data: [], error: null });
      setupFromMock({ families: familiesChain });

      const result = await GET(createRequest());

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.results.settlement).toEqual({
        processed: 0,
        errors: [],
      });
      // Not Sunday, so weekly should be null
      expect(result.body.results.weekly).toBeNull();
      // Monthly runs but no families match
      expect(result.body.results.monthly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    });

    it("runs weekly reports on Sunday", async () => {
      // Sunday, Jan 19, 2025
      setFakeDate(new Date(Date.UTC(2025, 0, 19, 0, 0, 0)));

      // No families for settlement / monthly (todayDay=19)
      const familiesChain = makeChain({ data: [], error: null });
      setupFromMock({ families: familiesChain });

      // Email service available but no families → returns default result
      const result = await GET(createRequest());

      expect(result.status).toBe(200);
      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    });

    it("skips weekly reports on non-Sunday", async () => {
      // Monday, Jan 20, 2025
      setFakeDate(new Date(Date.UTC(2025, 0, 20, 0, 0, 0)));

      const familiesChain = makeChain({ data: [], error: null });
      setupFromMock({ families: familiesChain });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toBeNull();
    });

    it("returns 500 on unexpected error", async () => {
      // Make createAdminClient throw by having mockFrom throw
      mockFrom.mockImplementation(() => {
        throw new Error("DB crash");
      });

      const result = await GET(createRequest());

      expect(result.status).toBe(500);
      expect(result.body.error).toBe("Internal server error");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Unexpected error in daily-jobs cron:",
        expect.any(Error)
      );
    });

    it("runs monthly reports for families due on their settlement day", async () => {
      // Jan 15, 2025 — not Sunday
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familyData = [
        { id: "fam-1", name: "Test Family", settlement_day: 15 },
      ];

      // Settlement families chain (1st call) and monthly families chain (2nd call)
      // Both query 'families' table with .or()
      const familiesChain = makeChain({ data: familyData, error: null });

      // Prefs: monthly report enabled, no override email
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          weekly_report_enabled: true,
          monthly_report_enabled: true,
          settlement_email_enabled: true,
          report_email: null,
          report_locale: "en",
        },
        error: null,
      });

      // Users chain: parent email
      const usersChain = makeChain({
        data: { email: "parent@test.com" },
        error: null,
      });

      // report_history: no existing, then insert + update
      const reportHistoryChain = makeChain({ data: null, error: null });

      // credit_settlements: no data for settlement notification
      const creditSettlementsChain = makeChain({
        data: [],
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        users: usersChain,
        report_history: reportHistoryChain,
        credit_settlements: creditSettlementsChain,
      });

      // Settlement RPC succeeds
      mockRpc.mockResolvedValue({ data: null, error: null });

      // Monthly report generation succeeds
      mockGenerateMonthlyReportData.mockResolvedValue({
        familyId: "fam-1",
        familyName: "Test Family",
        locale: "en",
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-01-31"),
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });

      // Send email succeeds
      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      expect(result.status).toBe(200);
      expect(result.body.results.settlement.processed).toBe(1);
      expect(result.body.results.monthly.sent).toBe(1);
    });
  });

  // ==================================================================
  // POST handler
  // ==================================================================
  describe("POST handler", () => {
    it("delegates to GET", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familiesChain = makeChain({ data: [], error: null });
      setupFromMock({ families: familiesChain });

      const result = await POST(createRequest());

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
    });
  });

  // ==================================================================
  // runSettlementIfDue (tested through GET)
  // ==================================================================
  describe("runSettlementIfDue", () => {
    beforeEach(() => {
      // Set to Jan 15, 2025 (Wednesday, not last day of month)
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));
    });

    it("returns empty result when no families match", async () => {
      const familiesChain = makeChain({ data: [], error: null });
      setupFromMock({ families: familiesChain });

      const result = await GET(createRequest());

      expect(result.body.results.settlement).toEqual({
        processed: 0,
        errors: [],
      });
    });

    it("returns error when family fetch fails", async () => {
      const familiesChain = makeChain({
        data: null,
        error: { message: "DB connection lost" },
      });
      setupFromMock({ families: familiesChain });

      const result = await GET(createRequest());

      expect(result.body.results.settlement.errors).toContain(
        "Failed to fetch families: DB connection lost"
      );
    });

    it("processes settlement for matching family", async () => {
      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Smith Family", settlement_day: 15 }],
        error: null,
      });
      const creditSettlementsChain = makeChain({ data: [], error: null });
      const prefsChain = makeChain({ data: null, error: null });
      const usersChain = makeChain({ data: null, error: null });

      setupFromMock({
        families: familiesChain,
        credit_settlements: creditSettlementsChain,
        family_report_preferences: prefsChain,
        users: usersChain,
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      // email service available but no email found → returns early from notification

      const result = await GET(createRequest());

      expect(result.body.results.settlement.processed).toBe(1);
      expect(result.body.results.settlement.errors).toHaveLength(0);
      expect(mockRpc).toHaveBeenCalledWith("run_monthly_settlement", {
        p_settlement_date: null,
      });
    });

    it("handles settlement RPC error (continues to next family)", async () => {
      const familiesChain = makeChain({
        data: [
          { id: "fam-1", name: "Broken Family", settlement_day: 15 },
          { id: "fam-2", name: "Good Family", settlement_day: 15 },
        ],
        error: null,
      });
      const creditSettlementsChain = makeChain({ data: [], error: null });
      const prefsChain = makeChain({ data: null, error: null });
      const usersChain = makeChain({ data: null, error: null });

      setupFromMock({
        families: familiesChain,
        credit_settlements: creditSettlementsChain,
        family_report_preferences: prefsChain,
        users: usersChain,
      });

      // First call errors, second succeeds
      mockRpc
        .mockResolvedValueOnce({ data: null, error: { message: "RPC failed" } })
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await GET(createRequest());

      expect(result.body.results.settlement.processed).toBe(1);
      expect(result.body.results.settlement.errors).toContain(
        "Settlement failed for Broken Family: RPC failed"
      );
    });

    it("handles settlement exception (continues to next family)", async () => {
      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Crash Family", settlement_day: 15 }],
        error: null,
      });

      setupFromMock({ families: familiesChain });

      mockRpc.mockRejectedValue(new Error("Network timeout"));

      const result = await GET(createRequest());

      expect(result.body.results.settlement.errors).toContain(
        "Settlement error for Crash Family: Network timeout"
      );
      expect(result.body.results.settlement.processed).toBe(0);
    });

    it("sends settlement notification after success", async () => {
      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Notified Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: "en",
        },
        error: null,
      });
      const creditSettlementsChain = makeChain({
        data: [
          {
            child_id: "child-1",
            users: { name: "Alice" },
            debt_amount: 10,
            interest_calculated: 1,
            interest_breakdown: [
              {
                tier_order: 1,
                min_debt: 0,
                max_debt: 50,
                debt_in_tier: 10,
                interest_rate: 0.1,
                interest_amount: 1,
              },
            ],
            credit_limit_before: 100,
            credit_limit_after: 90,
            credit_limit_adjustment: -10,
          },
        ],
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      expect(result.body.results.settlement.processed).toBe(1);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "parent@test.com",
        subject: "Settlement Notice",
        html: "<html>settlement</html>",
      });
    });
  });

  // ==================================================================
  // sendSettlementNotification (tested through GET + settlement)
  // ==================================================================
  describe("sendSettlementNotification", () => {
    beforeEach(() => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));
    });

    it("returns early when email service not available", async () => {
      mockIsEmailServiceAvailable.mockReturnValue(false);

      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      setupFromMock({ families: familiesChain });
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await GET(createRequest());

      expect(result.body.results.settlement.processed).toBe(1);
      // sendEmail should NOT have been called for settlement notification
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("returns early when settlement email disabled in prefs", async () => {
      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: false,
          report_email: "test@test.com",
          report_locale: "en",
        },
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });

      await GET(createRequest());

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("returns early when no email found", async () => {
      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: null,
          report_locale: "en",
        },
        error: null,
      });
      // No parent email found
      const usersChain = makeChain({ data: null, error: null });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        users: usersChain,
      });

      mockRpc.mockResolvedValue({ data: null, error: null });

      await GET(createRequest());

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("returns early when no settlements found", async () => {
      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: "en",
        },
        error: null,
      });
      // No settlements
      const creditSettlementsChain = makeChain({ data: [], error: null });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });

      await GET(createRequest());

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("returns early when settlements data is null", async () => {
      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: "en",
        },
        error: null,
      });
      // Null settlements data
      const creditSettlementsChain = makeChain({ data: null, error: null });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });

      await GET(createRequest());

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("handles settlement with missing interest breakdown", async () => {
      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: "zh-CN",
        },
        error: null,
      });
      const creditSettlementsChain = makeChain({
        data: [
          {
            child_id: "child-1",
            users: null, // missing user name
            debt_amount: 5,
            interest_calculated: 0,
            interest_breakdown: null, // not an array
            credit_limit_before: 50,
            credit_limit_after: 50,
            credit_limit_adjustment: 0,
          },
        ],
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "parent@test.com",
          subject: "Settlement Notice",
        })
      );
    });
  });

  // ==================================================================
  // runWeeklyReports (tested through GET on Sunday)
  // ==================================================================
  describe("runWeeklyReports", () => {
    beforeEach(() => {
      // Sunday, Jan 19, 2025
      setFakeDate(new Date(Date.UTC(2025, 0, 19, 0, 0, 0)));
    });

    it("returns empty when email service not available", async () => {
      mockIsEmailServiceAvailable.mockReturnValue(false);

      // No families for settlement (todayDay=19)
      const familiesChain = makeChain({ data: [], error: null });
      setupFromMock({ families: familiesChain });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    });

    it("returns empty when family fetch fails", async () => {
      // Settlement families: no match
      // Weekly families: error
      // We need 'families' to return different results on different calls.
      // First call is for settlement (or() chain), second call is for weekly (select only).
      // Since both query "families", we need to handle call order.
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) {
            // Settlement query
            return makeChain({ data: [], error: null });
          } else if (callCount === 2) {
            // Weekly reports query
            return makeChain({
              data: null,
              error: { message: "Fetch failed" },
            });
          } else {
            // Monthly query
            return makeChain({ data: [], error: null });
          }
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 0,
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to fetch families for weekly reports:",
        expect.objectContaining({ message: "Fetch failed" })
      );
    });

    it("skips family when weekly report disabled", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: false,
              report_email: "test@test.com",
            },
            error: null,
          });
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 1,
      });
    });

    it("skips family when report already sent (duplicate check)", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: null,
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          // existing report found (duplicate)
          return makeChain({ data: { id: "existing-report" }, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 1,
      });
    });

    it("skips family when no email found", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: null,
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null }); // no duplicate
        }
        if (table === "users") {
          return makeChain({ data: null, error: null }); // no parent
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 1,
      });
    });

    it("increments failed when report data generation fails", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: "parent@test.com",
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null }); // no duplicate
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue(null);

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 1,
        skipped: 0,
      });
    });

    it("successfully sends report and increments sent", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: "parent@test.com",
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          const chain = makeChain({ data: null, error: null });
          return chain;
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        familyName: "Family",
        locale: "en",
        periodStart: new Date("2025-01-13"),
        periodEnd: new Date("2025-01-19"),
        children: [],
        totalStarsEarned: 10,
        totalStarsSpent: 5,
      });

      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 1,
        failed: 0,
        skipped: 0,
      });
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "parent@test.com",
        subject: "Weekly Report",
        html: "<html>weekly</html>",
      });
    });

    it("increments failed when email send fails", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: "parent@test.com",
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        familyName: "Family",
        locale: "en",
        periodStart: new Date("2025-01-13"),
        periodEnd: new Date("2025-01-19"),
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });

      mockSendEmail.mockResolvedValue({
        success: false,
        error: "SMTP error",
      });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 1,
        skipped: 0,
      });
    });

    it("handles exception for a family (failed++)", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Crash Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          // Throw exception when accessing prefs
          throw new Error("Unexpected crash");
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.weekly).toEqual({
        sent: 0,
        failed: 1,
        skipped: 0,
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Weekly report error for Crash Family:",
        expect.any(Error)
      );
    });

    it("uses override email from prefs when available", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: "override@test.com",
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        familyName: "Family",
        locale: "en",
        periodStart: new Date("2025-01-13"),
        periodEnd: new Date("2025-01-19"),
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });

      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      expect(result.body.results.weekly.sent).toBe(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "override@test.com" })
      );
    });

    it("uses parent email from DB when no override", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: null, // no override
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        if (table === "users") {
          return makeChain({
            data: { email: "db-parent@test.com" },
            error: null,
          });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        familyName: "Family",
        locale: "en",
        periodStart: new Date("2025-01-13"),
        periodEnd: new Date("2025-01-19"),
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });

      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      expect(result.body.results.weekly.sent).toBe(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "db-parent@test.com" })
      );
    });

    it("defaults to 'en' locale when prefs have no locale", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null });
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            });
          return makeChain({ data: [], error: null });
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: "test@test.com",
              report_locale: null, // no locale
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        locale: "en",
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      // generateWeeklyReportData should be called with "en" as locale
      expect(mockGenerateWeeklyReportData).toHaveBeenCalledWith(
        "fam-1",
        expect.any(Date),
        expect.any(Date),
        "en"
      );
    });

    it("defaults to enabled when no prefs exist (prefs is null)", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null });
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            });
          return makeChain({ data: [], error: null });
        }
        if (table === "family_report_preferences") {
          return makeChain({ data: null, error: null }); // no prefs → defaults apply
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        if (table === "users") {
          return makeChain({
            data: { email: "parent@test.com" },
            error: null,
          });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        locale: "en",
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });
      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      // Should NOT be skipped because prefs is null (defaults to enabled)
      expect(result.body.results.weekly.sent).toBe(1);
    });
  });

  // ==================================================================
  // runMonthlyReports (tested through GET on settlement day)
  // ==================================================================
  describe("runMonthlyReports", () => {
    beforeEach(() => {
      // Wednesday, Jan 15, 2025 — not Sunday, not last day
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));
    });

    it("returns empty when email service not available", async () => {
      mockIsEmailServiceAvailable.mockReturnValue(false);

      const familiesChain = makeChain({ data: [], error: null });
      setupFromMock({ families: familiesChain });

      const result = await GET(createRequest());

      // Monthly should return default (email not available)
      expect(result.body.results.monthly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    });

    it("returns empty when family fetch fails or returns null", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          // monthly families fetch: error
          return makeChain({
            data: null,
            error: { message: "Monthly fetch failed" },
          });
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.monthly).toEqual({
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    });

    it("skips family when monthly report disabled", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          return makeChain({
            data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
            error: null,
          }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              monthly_report_enabled: false,
              report_email: "test@test.com",
            },
            error: null,
          });
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.monthly.skipped).toBe(1);
    });

    it("skips family when report already sent (duplicate check)", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          return makeChain({
            data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
            error: null,
          }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              monthly_report_enabled: true,
              report_email: null,
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: { id: "existing" }, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.monthly.skipped).toBe(1);
    });

    it("skips family when no email found", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          return makeChain({
            data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
            error: null,
          }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              monthly_report_enabled: true,
              report_email: null,
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        if (table === "users") {
          return makeChain({ data: null, error: null }); // no parent
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.monthly.skipped).toBe(1);
    });

    it("increments failed when report data generation fails", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          return makeChain({
            data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
            error: null,
          }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              monthly_report_enabled: true,
              report_email: "parent@test.com",
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateMonthlyReportData.mockResolvedValue(null);

      const result = await GET(createRequest());

      expect(result.body.results.monthly.failed).toBe(1);
    });

    it("successfully sends monthly report", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          return makeChain({
            data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
            error: null,
          }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              monthly_report_enabled: true,
              report_email: "parent@test.com",
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateMonthlyReportData.mockResolvedValue({
        familyId: "fam-1",
        familyName: "Family",
        locale: "en",
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-01-31"),
        children: [],
        totalStarsEarned: 50,
        totalStarsSpent: 20,
      });

      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      expect(result.body.results.monthly.sent).toBe(1);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "parent@test.com",
        subject: "Monthly Report",
        html: "<html>monthly</html>",
      });
    });

    it("increments failed when email send fails", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null });
          return makeChain({
            data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
            error: null,
          });
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              monthly_report_enabled: true,
              report_email: "parent@test.com",
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateMonthlyReportData.mockResolvedValue({
        familyId: "fam-1",
        locale: "en",
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });

      mockSendEmail.mockResolvedValue({
        success: false,
        error: "Email delivery failure",
      });

      const result = await GET(createRequest());

      expect(result.body.results.monthly.failed).toBe(1);
    });

    it("handles exception for a family (failed++)", async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          return makeChain({
            data: [{ id: "fam-1", name: "Crash Monthly" , settlement_day: 15 }],
            error: null,
          }); // monthly
        }
        if (table === "family_report_preferences") {
          throw new Error("Monthly prefs crash");
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.monthly.failed).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Monthly report error for Crash Monthly:",
        expect.any(Error)
      );
    });

    it("handles last day of month with settlement_day = 0", async () => {
      // Jan 31, 2025 — last day of month, Friday (not Sunday)
      setFakeDate(new Date(Date.UTC(2025, 0, 31, 0, 0, 0)));

      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "End-of-Month Family", settlement_day: 0 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          monthly_report_enabled: true,
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: "en",
        },
        error: null,
      });
      const reportHistoryChain = makeChain({ data: null, error: null });
      const creditSettlementsChain = makeChain({ data: [], error: null });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        report_history: reportHistoryChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockGenerateMonthlyReportData.mockResolvedValue({
        familyId: "fam-1",
        locale: "en",
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });
      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      // Should process settlement for settlement_day=0 on last day
      expect(result.body.results.settlement.processed).toBe(1);
      // Monthly report should also be sent
      expect(result.body.results.monthly.sent).toBe(1);
    });
  });

  // ==================================================================
  // getReportEmail (tested through weekly/monthly/settlement paths)
  // ==================================================================
  describe("getReportEmail", () => {
    it("returns override email when provided (tested via settlement notification)", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "custom@override.com",
          report_locale: "en",
        },
        error: null,
      });
      const creditSettlementsChain = makeChain({
        data: [
          {
            child_id: "child-1",
            users: { name: "Bob" },
            debt_amount: 5,
            interest_calculated: 0.5,
            interest_breakdown: [],
            credit_limit_before: 100,
            credit_limit_after: 95,
            credit_limit_adjustment: -5,
          },
        ],
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "custom@override.com" })
      );
    });

    it("returns parent email from DB when no override (tested via weekly)", async () => {
      // Sunday for weekly reports
      setFakeDate(new Date(Date.UTC(2025, 0, 19, 0, 0, 0)));

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: null, // no override
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        if (table === "users") {
          return makeChain({
            data: { email: "real-parent@family.com" },
            error: null,
          });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        locale: "en",
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "real-parent@family.com" })
      );
    });

    it("returns null when no parent found (skips sending)", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 19, 0, 0, 0)));

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: null,
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        if (table === "users") {
          // No parent found
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      // Should skip since no email
      expect(result.body.results.weekly.skipped).toBe(1);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("returns null when parent email is null", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 19, 0, 0, 0)));

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null });
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            });
          return makeChain({ data: [], error: null });
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: null,
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        if (table === "users") {
          // Parent exists but email is null
          return makeChain({ data: { email: null }, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      const result = await GET(createRequest());

      expect(result.body.results.weekly.skipped).toBe(1);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  // ==================================================================
  // Integration-like: Sunday + settlement day combined
  // ==================================================================
  describe("combined scenarios", () => {
    it("runs all three jobs when Sunday is also settlement day", async () => {
      // Sunday, Jan 19, 2025 — todayDay = 19
      setFakeDate(new Date(Date.UTC(2025, 0, 19, 0, 0, 0)));

      // Family with settlement_day = 19
      const settlementFamilies = [
        { id: "fam-1", name: "Sunday Family", settlement_day: 19 },
      ];
      const weeklyFamilies = [
        { id: "fam-1", name: "Sunday Family" },
      ];

      let familyCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          familyCallCount++;
          if (familyCallCount === 1) {
            // Settlement families
            return makeChain({ data: settlementFamilies, error: null });
          }
          if (familyCallCount === 2) {
            // Weekly families
            return makeChain({ data: weeklyFamilies, error: null });
          }
          // Monthly families
          return makeChain({ data: settlementFamilies, error: null });
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              monthly_report_enabled: true,
              settlement_email_enabled: true,
              report_email: "all@test.com",
              report_locale: "en",
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        if (table === "credit_settlements") {
          return makeChain({ data: [], error: null }); // no settlements for notification
        }
        return makeChain({ data: null, error: null });
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        locale: "en",
        children: [],
        totalStarsEarned: 10,
        totalStarsSpent: 5,
      });
      mockGenerateMonthlyReportData.mockResolvedValue({
        familyId: "fam-1",
        locale: "en",
        children: [],
        totalStarsEarned: 50,
        totalStarsSpent: 20,
      });
      mockSendEmail.mockResolvedValue({ success: true });

      const result = await GET(createRequest());

      expect(result.body.results.settlement.processed).toBe(1);
      expect(result.body.results.weekly.sent).toBe(1);
      expect(result.body.results.monthly.sent).toBe(1);
    });

    it("handles non-Error exceptions in settlement", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "String Error Family", settlement_day: 15 }],
        error: null,
      });
      setupFromMock({ families: familiesChain });

      // Throw a non-Error value
      mockRpc.mockRejectedValue("some string error");

      const result = await GET(createRequest());

      expect(result.body.results.settlement.errors).toContain(
        "Settlement error for String Error Family: Unknown error"
      );
    });

    it("handles multiple families in settlement with mixed results", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familiesChain = makeChain({
        data: [
          { id: "fam-1", name: "Success Family", settlement_day: 15 },
          { id: "fam-2", name: "Error Family", settlement_day: 15 },
          { id: "fam-3", name: "Exception Family", settlement_day: 15 },
        ],
        error: null,
      });
      const prefsChain = makeChain({ data: null, error: null });
      const usersChain = makeChain({ data: null, error: null });
      const creditSettlementsChain = makeChain({ data: [], error: null });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        users: usersChain,
        credit_settlements: creditSettlementsChain,
      });

      mockRpc
        .mockResolvedValueOnce({ data: null, error: null }) // Success
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Constraint violation" },
        }) // Error
        .mockRejectedValueOnce(new Error("Crash")); // Exception

      const result = await GET(createRequest());

      expect(result.body.results.settlement.processed).toBe(1);
      expect(result.body.results.settlement.errors).toHaveLength(2);
      expect(result.body.results.settlement.errors[0]).toContain(
        "Error Family"
      );
      expect(result.body.results.settlement.errors[1]).toContain(
        "Exception Family"
      );
    });
  });

  // ==================================================================
  // Branch coverage: locale fallback and interest_breakdown handling
  // ==================================================================
  describe("Branch coverage", () => {
    it("weekly report locale falls back to 'en' when report_locale is null", async () => {
      // Sunday for weekly reports
      setFakeDate(new Date(Date.UTC(2025, 0, 19, 0, 0, 0)));

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          if (callCount === 2)
            return makeChain({
              data: [{ id: "fam-1", name: "Family" }],
              error: null,
            }); // weekly
          return makeChain({ data: [], error: null }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              weekly_report_enabled: true,
              report_email: "test@test.com",
              report_locale: null, // null locale → fallback to "en"
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateWeeklyReportData.mockResolvedValue({
        familyId: "fam-1",
        familyName: "Family",
        locale: "en",
        periodStart: new Date("2025-01-13"),
        periodEnd: new Date("2025-01-19"),
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      // Verify "en" was passed as the locale to generateWeeklyReportData
      expect(mockGenerateWeeklyReportData).toHaveBeenCalledWith(
        "fam-1",
        expect.any(Date),
        expect.any(Date),
        "en"
      );
      // Verify "en" was passed as locale to getWeeklyReportSubject
      expect(mockGetWeeklyReportSubject).toHaveBeenCalledWith(
        expect.anything(),
        "en"
      );
    });

    it("monthly report locale falls back to 'en' when report_locale is null", async () => {
      // Wednesday, Jan 15 — settlement day
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "families") {
          callCount++;
          if (callCount === 1) return makeChain({ data: [], error: null }); // settlement
          return makeChain({
            data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
            error: null,
          }); // monthly
        }
        if (table === "family_report_preferences") {
          return makeChain({
            data: {
              family_id: "fam-1",
              monthly_report_enabled: true,
              report_email: "test@test.com",
              report_locale: null, // null locale → fallback to "en"
            },
            error: null,
          });
        }
        if (table === "report_history") {
          return makeChain({ data: null, error: null });
        }
        return makeChain({ data: null, error: null });
      });

      mockGenerateMonthlyReportData.mockResolvedValue({
        familyId: "fam-1",
        familyName: "Family",
        locale: "en",
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-01-31"),
        children: [],
        totalStarsEarned: 0,
        totalStarsSpent: 0,
      });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      // Verify "en" was passed as the locale to generateMonthlyReportData
      expect(mockGenerateMonthlyReportData).toHaveBeenCalledWith(
        "fam-1",
        expect.any(Date),
        expect.any(Date),
        "en"
      );
      // Verify "en" was passed as locale to getMonthlyReportSubject
      expect(mockGetMonthlyReportSubject).toHaveBeenCalledWith(
        expect.anything(),
        "en"
      );
    });

    it("settlement notice locale falls back to 'en' when report_locale is null", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: null, // null locale → fallback to "en"
        },
        error: null,
      });
      const creditSettlementsChain = makeChain({
        data: [
          {
            child_id: "child-1",
            users: { name: "Alice" },
            debt_amount: 10,
            interest_calculated: 1,
            interest_breakdown: [],
            credit_limit_before: 100,
            credit_limit_after: 90,
            credit_limit_adjustment: -10,
          },
        ],
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      // Verify the settlement notice HTML was generated with locale "en" in the data
      expect(mockGenerateSettlementNoticeHtml).toHaveBeenCalledWith(
        expect.objectContaining({ locale: "en" })
      );
      // Verify "en" was passed as locale to getSettlementNoticeSubject
      expect(mockGetSettlementNoticeSubject).toHaveBeenCalledWith(
        expect.anything(),
        "en"
      );
    });

    it("interest_breakdown not an array results in empty array", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: "en",
        },
        error: null,
      });
      const creditSettlementsChain = makeChain({
        data: [
          {
            child_id: "child-1",
            users: { name: "Alice" },
            debt_amount: 10,
            interest_calculated: 1,
            interest_breakdown: null, // not an array → should become []
            credit_limit_before: 100,
            credit_limit_after: 90,
            credit_limit_adjustment: -10,
          },
        ],
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      // Verify generateSettlementNoticeHtml was called with children having empty interestBreakdown
      expect(mockGenerateSettlementNoticeHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              childId: "child-1",
              interestBreakdown: [], // null was converted to empty array
            }),
          ]),
        })
      );
    });

    it("interest_breakdown tier with missing properties uses fallback defaults", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: "en",
        },
        error: null,
      });
      // Tier with all null/undefined properties to exercise || 0 and || null defaults
      const creditSettlementsChain = makeChain({
        data: [
          {
            child_id: "child-1",
            users: { name: "Bob" },
            debt_amount: 20,
            interest_calculated: 2,
            interest_breakdown: [
              {
                tier_order: null,
                min_debt: null,
                max_debt: null,
                debt_in_tier: null,
                interest_rate: null,
                interest_amount: null,
              },
            ],
            credit_limit_before: 100,
            credit_limit_after: 80,
            credit_limit_adjustment: -20,
          },
        ],
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      // Verify the tier was mapped with default values (|| 0 and || null)
      expect(mockGenerateSettlementNoticeHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              childId: "child-1",
              interestBreakdown: [
                {
                  tierOrder: 0,       // null || 0
                  minDebt: 0,         // null || 0
                  maxDebt: null,      // null || null
                  debtInTier: 0,      // null || 0
                  rate: 0,            // null || 0
                  interestAmount: 0,  // null || 0
                },
              ],
            }),
          ]),
        })
      );
    });

    it("interest_breakdown with complete tier data maps correctly", async () => {
      setFakeDate(new Date(Date.UTC(2025, 0, 15, 0, 0, 0)));

      const familiesChain = makeChain({
        data: [{ id: "fam-1", name: "Family", settlement_day: 15 }],
        error: null,
      });
      const prefsChain = makeChain({
        data: {
          family_id: "fam-1",
          settlement_email_enabled: true,
          report_email: "parent@test.com",
          report_locale: "en",
        },
        error: null,
      });
      // Full tier data with all properties present
      const creditSettlementsChain = makeChain({
        data: [
          {
            child_id: "child-1",
            users: { name: "Charlie" },
            debt_amount: 30,
            interest_calculated: 3.5,
            interest_breakdown: [
              {
                tier_order: 1,
                min_debt: 0,
                max_debt: 20,
                debt_in_tier: 20,
                interest_rate: 0.1,
                interest_amount: 2,
              },
              {
                tier_order: 2,
                min_debt: 20,
                max_debt: 50,
                debt_in_tier: 10,
                interest_rate: 0.15,
                interest_amount: 1.5,
              },
            ],
            credit_limit_before: 100,
            credit_limit_after: 70,
            credit_limit_adjustment: -30,
          },
        ],
        error: null,
      });

      setupFromMock({
        families: familiesChain,
        family_report_preferences: prefsChain,
        credit_settlements: creditSettlementsChain,
        users: makeChain({ data: null, error: null }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      mockSendEmail.mockResolvedValue({ success: true });

      await GET(createRequest());

      // Verify full tier data is correctly mapped through
      expect(mockGenerateSettlementNoticeHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              childId: "child-1",
              name: "Charlie",
              debtAmount: 30,
              interestCharged: 3.5,
              interestBreakdown: [
                {
                  tierOrder: 1,
                  minDebt: 0,
                  maxDebt: 20,
                  debtInTier: 20,
                  rate: 0.1,
                  interestAmount: 2,
                },
                {
                  tierOrder: 2,
                  minDebt: 20,
                  maxDebt: 50,
                  debtInTier: 10,
                  rate: 0.15,
                  interestAmount: 1.5,
                },
              ],
              creditLimitBefore: 100,
              creditLimitAfter: 70,
              creditLimitChange: -30,
            }),
          ]),
        })
      );
    });
  });
});
