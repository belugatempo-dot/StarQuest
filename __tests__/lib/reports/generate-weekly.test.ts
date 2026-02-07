import { getWeekBounds, generateWeeklyReportData } from "@/lib/reports/generate-weekly";
import * as reportUtils from "@/lib/reports/report-utils";

// Mock the admin client
jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

jest.mock("@/lib/reports/report-utils");

describe("Weekly Report Generation", () => {
  describe("getWeekBounds", () => {
    it("returns correct week bounds for a Sunday", () => {
      // Test with a known Sunday: January 19, 2025
      const testDate = new Date(Date.UTC(2025, 0, 19, 12, 0, 0)); // Sunday
      const { weekStart, weekEnd } = getWeekBounds(testDate);

      // Should return the previous week (Sun Jan 12 - Sat Jan 18)
      expect(weekStart.getUTCFullYear()).toBe(2025);
      expect(weekStart.getUTCMonth()).toBe(0);
      expect(weekStart.getUTCDate()).toBe(12);
      expect(weekStart.getUTCDay()).toBe(0); // Sunday

      expect(weekEnd.getUTCFullYear()).toBe(2025);
      expect(weekEnd.getUTCMonth()).toBe(0);
      expect(weekEnd.getUTCDate()).toBe(18);
      expect(weekEnd.getUTCDay()).toBe(6); // Saturday
    });

    it("returns correct week bounds for a Wednesday", () => {
      // Test with a Wednesday: January 15, 2025
      const testDate = new Date(Date.UTC(2025, 0, 15, 12, 0, 0)); // Wednesday
      const { weekStart, weekEnd } = getWeekBounds(testDate);

      // Should return the previous week (Sun Jan 5 - Sat Jan 11)
      expect(weekStart.getUTCFullYear()).toBe(2025);
      expect(weekStart.getUTCMonth()).toBe(0);
      expect(weekStart.getUTCDate()).toBe(5);
      expect(weekStart.getUTCDay()).toBe(0); // Sunday

      expect(weekEnd.getUTCDate()).toBe(11);
      expect(weekEnd.getUTCDay()).toBe(6); // Saturday
    });

    it("handles month boundaries correctly", () => {
      // Test with a date near end of month: February 2, 2025
      const testDate = new Date(Date.UTC(2025, 1, 2, 12, 0, 0)); // Sunday
      const { weekStart, weekEnd } = getWeekBounds(testDate);

      // Should return previous week that crosses into January
      expect(weekStart.getUTCMonth()).toBe(0); // January
      expect(weekEnd.getUTCMonth()).toBe(1); // February
    });

    it("handles year boundaries correctly", () => {
      // Test with a date in early January 2025
      const testDate = new Date(Date.UTC(2025, 0, 5, 12, 0, 0)); // Sunday
      const { weekStart, weekEnd } = getWeekBounds(testDate);

      // Should return previous week in December 2024
      expect(weekStart.getUTCFullYear()).toBe(2024);
      expect(weekStart.getUTCMonth()).toBe(11); // December
    });

    it("weekStart is at start of day", () => {
      const testDate = new Date(Date.UTC(2025, 0, 19, 12, 0, 0));
      const { weekStart } = getWeekBounds(testDate);

      expect(weekStart.getUTCHours()).toBe(0);
      expect(weekStart.getUTCMinutes()).toBe(0);
      expect(weekStart.getUTCSeconds()).toBe(0);
    });

    it("uses current date when no argument provided", () => {
      const { weekStart, weekEnd } = getWeekBounds();
      // Should return valid dates regardless of current date
      expect(weekStart).toBeInstanceOf(Date);
      expect(weekEnd).toBeInstanceOf(Date);
      expect(weekStart.getUTCDay()).toBe(0); // Sunday
      expect(weekEnd.getUTCDay()).toBe(6); // Saturday
      expect(weekEnd > weekStart).toBe(true);
    });

    it("weekEnd is at end of day", () => {
      const testDate = new Date(Date.UTC(2025, 0, 19, 12, 0, 0));
      const { weekEnd } = getWeekBounds(testDate);

      expect(weekEnd.getUTCHours()).toBe(23);
      expect(weekEnd.getUTCMinutes()).toBe(59);
      expect(weekEnd.getUTCSeconds()).toBe(59);
    });
  });

  describe("generateWeeklyReportData", () => {
    const mockFetchReportBaseData = reportUtils.fetchReportBaseData as jest.Mock;
    const mockBuildChildrenStats = reportUtils.buildChildrenStats as jest.Mock;

    beforeEach(() => {
      mockFetchReportBaseData.mockReset();
      mockBuildChildrenStats.mockReset();
    });

    it("returns null when fetchReportBaseData returns null", async () => {
      mockFetchReportBaseData.mockResolvedValue(null);

      const result = await generateWeeklyReportData(
        "fam-1",
        new Date("2025-01-12"),
        new Date("2025-01-18"),
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

      const result = await generateWeeklyReportData(
        "fam-1",
        new Date("2025-01-12"),
        new Date("2025-01-18"),
        "en"
      );
      expect(result).not.toBeNull();
      expect(result!.children).toEqual([]);
      expect(result!.totalStarsEarned).toBe(0);
      expect(result!.totalStarsSpent).toBe(0);
      expect(result!.familyName).toBe("Test Family");
    });

    it("returns report with children stats", async () => {
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
          starsEarned: 20,
          starsSpent: 5,
          netStars: 15,
          currentBalance: 100,
          creditBorrowed: 0,
          creditRepaid: 0,
          topQuests: [],
          pendingRequestsCount: 0,
        }],
        totalEarned: 20,
        totalSpent: 5,
      });

      const weekStart = new Date("2025-01-12");
      const weekEnd = new Date("2025-01-18");
      const result = await generateWeeklyReportData("fam-1", weekStart, weekEnd, "en");

      expect(result).not.toBeNull();
      expect(result!.familyId).toBe("fam-1");
      expect(result!.familyName).toBe("Test Family");
      expect(result!.locale).toBe("en");
      expect(result!.children.length).toBe(1);
      expect(result!.totalStarsEarned).toBe(20);
      expect(result!.totalStarsSpent).toBe(5);
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

      const result = await generateWeeklyReportData(
        "fam-1",
        new Date("2025-01-12"),
        new Date("2025-01-18")
      );
      expect(result!.locale).toBe("en");
    });
  });
});
