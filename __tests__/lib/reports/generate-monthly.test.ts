import {
  getMonthBounds,
  getPreviousMonthBounds,
  generateMonthlyReportData,
} from "@/lib/reports/generate-monthly";
import * as reportUtils from "@/lib/reports/report-utils";

// Mock the admin client
const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  limit: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
}));
jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.mock("@/lib/reports/report-utils");

describe("Monthly Report Generation", () => {
  describe("getMonthBounds", () => {
    it("returns correct bounds for January", () => {
      const testDate = new Date(Date.UTC(2025, 0, 15, 12, 0, 0)); // Jan 15, 2025
      const { monthStart, monthEnd } = getMonthBounds(testDate);

      expect(monthStart.getUTCFullYear()).toBe(2025);
      expect(monthStart.getUTCMonth()).toBe(0);
      expect(monthStart.getUTCDate()).toBe(1);

      expect(monthEnd.getUTCFullYear()).toBe(2025);
      expect(monthEnd.getUTCMonth()).toBe(0);
      expect(monthEnd.getUTCDate()).toBe(31);
    });

    it("returns correct bounds for February (non-leap year)", () => {
      const testDate = new Date(Date.UTC(2025, 1, 15, 12, 0, 0)); // Feb 15, 2025
      const { monthStart, monthEnd } = getMonthBounds(testDate);

      expect(monthStart.getUTCDate()).toBe(1);
      expect(monthEnd.getUTCDate()).toBe(28);
    });

    it("returns correct bounds for February (leap year)", () => {
      const testDate = new Date(Date.UTC(2024, 1, 15, 12, 0, 0)); // Feb 15, 2024
      const { monthStart, monthEnd } = getMonthBounds(testDate);

      expect(monthStart.getUTCDate()).toBe(1);
      expect(monthEnd.getUTCDate()).toBe(29);
    });

    it("returns correct bounds for April (30 days)", () => {
      const testDate = new Date(Date.UTC(2025, 3, 15, 12, 0, 0)); // April 15, 2025
      const { monthStart, monthEnd } = getMonthBounds(testDate);

      expect(monthStart.getUTCDate()).toBe(1);
      expect(monthEnd.getUTCDate()).toBe(30);
    });

    it("monthStart is at start of day", () => {
      const testDate = new Date(Date.UTC(2025, 0, 15, 12, 0, 0));
      const { monthStart } = getMonthBounds(testDate);

      expect(monthStart.getUTCHours()).toBe(0);
      expect(monthStart.getUTCMinutes()).toBe(0);
      expect(monthStart.getUTCSeconds()).toBe(0);
    });

    it("monthEnd is at end of day", () => {
      const testDate = new Date(Date.UTC(2025, 0, 15, 12, 0, 0));
      const { monthEnd } = getMonthBounds(testDate);

      expect(monthEnd.getUTCHours()).toBe(23);
      expect(monthEnd.getUTCMinutes()).toBe(59);
      expect(monthEnd.getUTCSeconds()).toBe(59);
    });
  });

  describe("getMonthBounds default parameter", () => {
    it("uses current date when no argument is provided", () => {
      const { monthStart, monthEnd } = getMonthBounds();
      const now = new Date();
      expect(monthStart.getUTCMonth()).toBe(now.getUTCMonth());
      expect(monthStart.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(monthStart.getUTCDate()).toBe(1);
      expect(monthEnd.getUTCMonth()).toBe(now.getUTCMonth());
    });
  });

  describe("getPreviousMonthBounds", () => {
    it("uses current date when no argument is provided", () => {
      const { monthStart } = getPreviousMonthBounds();
      const now = new Date();
      const expectedMonth = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
      expect(monthStart.getUTCMonth()).toBe(expectedMonth);
    });

    it("returns correct bounds for previous month", () => {
      const testDate = new Date(Date.UTC(2025, 1, 15, 12, 0, 0)); // Feb 15, 2025
      const { monthStart, monthEnd } = getPreviousMonthBounds(testDate);

      // Should return January 2025
      expect(monthStart.getUTCFullYear()).toBe(2025);
      expect(monthStart.getUTCMonth()).toBe(0);
      expect(monthStart.getUTCDate()).toBe(1);

      expect(monthEnd.getUTCDate()).toBe(31);
    });

    it("handles year boundary correctly", () => {
      const testDate = new Date(Date.UTC(2025, 0, 15, 12, 0, 0)); // Jan 15, 2025
      const { monthStart, monthEnd } = getPreviousMonthBounds(testDate);

      // Should return December 2024
      expect(monthStart.getUTCFullYear()).toBe(2024);
      expect(monthStart.getUTCMonth()).toBe(11);
      expect(monthStart.getUTCDate()).toBe(1);

      expect(monthEnd.getUTCDate()).toBe(31);
    });

    it("handles March to February correctly", () => {
      const testDate = new Date(Date.UTC(2025, 2, 15, 12, 0, 0)); // March 15, 2025
      const { monthStart, monthEnd } = getPreviousMonthBounds(testDate);

      // Should return February 2025 (28 days)
      expect(monthStart.getUTCMonth()).toBe(1);
      expect(monthEnd.getUTCDate()).toBe(28);
    });
  });

  describe("generateMonthlyReportData", () => {
    const mockFetchReportBaseData = reportUtils.fetchReportBaseData as jest.Mock;
    const mockBuildChildrenStats = reportUtils.buildChildrenStats as jest.Mock;

    beforeEach(() => {
      mockFetchReportBaseData.mockReset();
      mockBuildChildrenStats.mockReset();
      mockFrom.mockClear();
    });

    it("returns null when fetchReportBaseData returns null", async () => {
      mockFetchReportBaseData.mockResolvedValue(null);

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        "en"
      );
      expect(result).toBeNull();
    });

    it("returns report with empty children when no children found", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test Family" },
        children: [],
        transactions: null,
        redemptions: null,
        balances: null,
        creditTx: null,
        pendingStars: null,
        pendingRedemptions: null,
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        "en"
      );
      expect(result).not.toBeNull();
      expect(result!.children).toEqual([]);
      expect(result!.totalStarsEarned).toBe(0);
      expect(result!.totalStarsSpent).toBe(0);
      expect(result!.familyName).toBe("Test Family");
    });

    it("returns report with children stats and settlement data", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test Family" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [{
          childId: "child-1",
          name: "Alice",
          starsEarned: 30,
          starsSpent: 10,
          netStars: 20,
          currentBalance: 100,
          creditBorrowed: 0,
          creditRepaid: 0,
          topQuests: [],
          pendingRequestsCount: 0,
        }],
        totalEarned: 30,
        totalSpent: 10,
      });

      // Mock the Supabase calls for settlement and comparison data
      const chainMock: any = {};
      chainMock.select = jest.fn().mockReturnValue(chainMock);
      chainMock.eq = jest.fn().mockReturnValue(chainMock);
      chainMock.gte = jest.fn().mockReturnValue(chainMock);
      chainMock.lte = jest.fn().mockReturnValue(chainMock);
      chainMock.in = jest.fn().mockReturnValue(chainMock);
      chainMock.single = jest.fn().mockResolvedValue({ data: null, error: null });
      // Make chainMock act as a thenable returning {data: [], error: null} by default
      chainMock.then = (cb: any) => Promise.resolve({ data: [], error: null }).then(cb);
      mockFrom.mockReturnValue(chainMock);

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.familyId).toBe("fam-1");
      expect(result!.familyName).toBe("Test Family");
      expect(result!.locale).toBe("en");
      expect(result!.children.length).toBe(1);
      expect(result!.totalStarsEarned).toBe(30);
      expect(result!.totalStarsSpent).toBe(10);
    });

    it("defaults locale to 'en'", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [],
        transactions: null,
        redemptions: null,
        balances: null,
        creditTx: null,
        pendingStars: null,
        pendingRedemptions: null,
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31")
      );
      expect(result!.locale).toBe("en");
    });

    it("includes settlement data when settlements exist", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test Family" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [{ childId: "child-1", name: "Alice", starsEarned: 10, starsSpent: 5, netStars: 5, currentBalance: 50, creditBorrowed: 0, creditRepaid: 0, topQuests: [], pendingRequestsCount: 0 }],
        totalEarned: 10,
        totalSpent: 5,
      });

      const callCounts: Record<string, number> = {};
      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        callCounts[table] = (callCounts[table] || 0) + 1;
        if (table === "credit_settlements") {
          return makeTableChain({
            data: [{
              child_id: "child-1",
              debt_amount: 20,
              interest_calculated: 2,
              interest_breakdown: [
                { tier_order: 1, min_debt: 0, max_debt: 50, debt_in_tier: 20, interest_rate: 0.1, interest_amount: 2 },
              ],
              credit_limit_before: 100,
              credit_limit_after: 90,
              credit_limit_adjustment: -10,
            }],
            error: null,
          });
        }
        if (table === "star_transactions") {
          return makeTableChain({
            data: [{ stars: 8 }, { stars: -3 }],
            error: null,
          });
        }
        if (table === "redemptions") {
          return makeTableChain({
            data: [{ stars_spent: 4 }],
            error: null,
          });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.settlementData).toBeDefined();
      expect(result!.settlementData!.length).toBe(1);
      expect(result!.settlementData![0].childId).toBe("child-1");
      expect(result!.settlementData![0].debtAmount).toBe(20);
      expect(result!.settlementData![0].interestCharged).toBe(2);
      expect(result!.settlementData![0].interestBreakdown.length).toBe(1);
      expect(result!.settlementData![0].interestBreakdown[0].tierOrder).toBe(1);
      expect(result!.settlementData![0].creditLimitChange).toBe(-10);
    });

    it("includes previous month comparison data", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [{ childId: "child-1", name: "Alice", starsEarned: 20, starsSpent: 10, netStars: 10, currentBalance: 50, creditBorrowed: 0, creditRepaid: 0, topQuests: [], pendingRequestsCount: 0 }],
        totalEarned: 20,
        totalSpent: 10,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      const callCounts: Record<string, number> = {};
      mockFrom.mockImplementation((table: string) => {
        callCounts[table] = (callCounts[table] || 0) + 1;
        if (table === "credit_settlements") {
          return makeTableChain({ data: [], error: null });
        }
        if (table === "star_transactions") {
          // Previous month: 10 stars earned
          return makeTableChain({ data: [{ stars: 10 }], error: null });
        }
        if (table === "redemptions") {
          // Previous month: 5 stars spent
          return makeTableChain({ data: [{ stars_spent: 5 }], error: null });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-02-01"),
        new Date("2025-02-28"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.previousMonthComparison).toBeDefined();
      // Current: 20 earned, 10 spent. Previous: 10 earned, 5 spent
      // earned change: ((20-10)/10)*100 = 100%
      // spent change: ((10-5)/5)*100 = 100%
      expect(result!.previousMonthComparison!.starsEarnedChange).toBe(100);
      expect(result!.previousMonthComparison!.starsSpentChange).toBe(100);
    });

    it("handles settlement error gracefully", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 0,
        totalSpent: 0,
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({ data: null, error: { message: "settlement error" } });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch settlements:", expect.any(Object));
      consoleSpy.mockRestore();
    });

    it("handles interest_breakdown tiers with missing/falsy fields", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 0,
        totalSpent: 0,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({
            data: [{
              child_id: "child-1",
              debt_amount: 10,
              interest_calculated: 1,
              interest_breakdown: [
                {
                  // All fields missing/falsy — tests || 0 and || null fallbacks
                },
              ],
              credit_limit_before: 100,
              credit_limit_after: 100,
              credit_limit_adjustment: 0,
            }],
            error: null,
          });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.settlementData).toBeDefined();
      const tier = result!.settlementData![0].interestBreakdown[0];
      expect(tier.tierOrder).toBe(0);
      expect(tier.minDebt).toBe(0);
      expect(tier.maxDebt).toBeNull();
      expect(tier.debtInTier).toBe(0);
      expect(tier.rate).toBe(0);
      expect(tier.interestAmount).toBe(0);
    });

    it("returns 100 for starsEarnedChange when prevEarned is 0 and totalEarned > 0", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 20,
        totalSpent: 10,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({ data: [], error: null });
        }
        if (table === "star_transactions") {
          // Previous month: no positive stars earned, only negative
          return makeTableChain({ data: [{ stars: -5 }], error: null });
        }
        if (table === "redemptions") {
          // Previous month: some spending to make prevSpent > 0 so comparison is created
          return makeTableChain({ data: [{ stars_spent: 3 }], error: null });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-02-01"),
        new Date("2025-02-28"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.previousMonthComparison).toBeDefined();
      // prevEarned=0, totalEarned=20 > 0 => starsEarnedChange=100
      expect(result!.previousMonthComparison!.starsEarnedChange).toBe(100);
    });

    it("returns 0 for starsEarnedChange when both prevEarned and totalEarned are 0", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 0,
        totalSpent: 10,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({ data: [], error: null });
        }
        if (table === "star_transactions") {
          // Previous month: no earned stars (only negative)
          return makeTableChain({ data: [{ stars: -2 }], error: null });
        }
        if (table === "redemptions") {
          return makeTableChain({ data: [{ stars_spent: 5 }], error: null });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-02-01"),
        new Date("2025-02-28"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.previousMonthComparison).toBeDefined();
      // prevEarned=0, totalEarned=0 => starsEarnedChange=0
      expect(result!.previousMonthComparison!.starsEarnedChange).toBe(0);
    });

    it("returns 100 for starsSpentChange when prevSpent is 0 and totalSpent > 0", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 20,
        totalSpent: 10,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({ data: [], error: null });
        }
        if (table === "star_transactions") {
          // Previous month: some earned stars, no deductions
          return makeTableChain({ data: [{ stars: 10 }], error: null });
        }
        if (table === "redemptions") {
          // Previous month: no redemptions, so prevSpent=0 (no deductions either)
          return makeTableChain({ data: [], error: null });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-02-01"),
        new Date("2025-02-28"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.previousMonthComparison).toBeDefined();
      // prevSpent=0, totalSpent=10 > 0 => starsSpentChange=100
      expect(result!.previousMonthComparison!.starsSpentChange).toBe(100);
    });

    it("returns 0 for starsSpentChange when both prevSpent and totalSpent are 0", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 20,
        totalSpent: 0,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({ data: [], error: null });
        }
        if (table === "star_transactions") {
          return makeTableChain({ data: [{ stars: 10 }], error: null });
        }
        if (table === "redemptions") {
          return makeTableChain({ data: [], error: null });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-02-01"),
        new Date("2025-02-28"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.previousMonthComparison).toBeDefined();
      // prevSpent=0, totalSpent=0 => starsSpentChange=0
      expect(result!.previousMonthComparison!.starsSpentChange).toBe(0);
    });

    it("does not include previousMonthComparison when both prevEarned and prevSpent are 0", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 20,
        totalSpent: 10,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({ data: [], error: null });
        }
        if (table === "star_transactions") {
          // No stars at all in previous month
          return makeTableChain({ data: [], error: null });
        }
        if (table === "redemptions") {
          return makeTableChain({ data: [], error: null });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-02-01"),
        new Date("2025-02-28"),
        "en"
      );

      expect(result).not.toBeNull();
      // prevEarned=0, prevSpent=0 => no comparison at all
      expect(result!.previousMonthComparison).toBeUndefined();
    });

    it("does not include previousMonthComparison when prevTransactions is null", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 20,
        totalSpent: 10,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({ data: [], error: null });
        }
        if (table === "star_transactions") {
          return makeTableChain({ data: null });
        }
        if (table === "redemptions") {
          return makeTableChain({ data: [{ stars_spent: 5 }] });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-02-01"),
        new Date("2025-02-28"),
        "en"
      );

      expect(result).not.toBeNull();
      // prevTransactions is null => condition `prevTransactions && prevRedemptions` is false
      expect(result!.previousMonthComparison).toBeUndefined();
    });

    it("handles non-array interest_breakdown", async () => {
      mockFetchReportBaseData.mockResolvedValue({
        family: { id: "fam-1", name: "Test" },
        children: [{ id: "child-1", name: "Alice" }],
        transactions: [],
        redemptions: [],
        balances: [],
        creditTx: [],
        pendingStars: [],
        pendingRedemptions: [],
      });
      mockBuildChildrenStats.mockReturnValue({
        childrenData: [],
        totalEarned: 0,
        totalSpent: 0,
      });

      const makeTableChain = (resolvedValue: any) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(resolvedValue);
        chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject);
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_settlements") {
          return makeTableChain({
            data: [{
              child_id: "child-1",
              debt_amount: 10,
              interest_calculated: 1,
              interest_breakdown: null, // not an array
              credit_limit_before: 100,
              credit_limit_after: 100,
              credit_limit_adjustment: 0,
            }],
            error: null,
          });
        }
        return makeTableChain({ data: [], error: null });
      });

      const result = await generateMonthlyReportData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        "en"
      );

      expect(result).not.toBeNull();
      expect(result!.settlementData).toBeDefined();
      expect(result!.settlementData![0].interestBreakdown).toEqual([]);
    });
  });
});
