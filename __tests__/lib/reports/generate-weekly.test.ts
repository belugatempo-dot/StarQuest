import { getWeekBounds } from "@/lib/reports/generate-weekly";

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

    it("weekEnd is at end of day", () => {
      const testDate = new Date(Date.UTC(2025, 0, 19, 12, 0, 0));
      const { weekEnd } = getWeekBounds(testDate);

      expect(weekEnd.getUTCHours()).toBe(23);
      expect(weekEnd.getUTCMinutes()).toBe(59);
      expect(weekEnd.getUTCSeconds()).toBe(59);
    });
  });
});
