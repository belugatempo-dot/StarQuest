import {
  getMonthBounds,
  getPreviousMonthBounds,
} from "@/lib/reports/generate-monthly";

// Mock the admin client
jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

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

  describe("getPreviousMonthBounds", () => {
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
});
