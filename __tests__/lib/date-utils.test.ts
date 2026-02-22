import {
  toLocalDateString,
  toLocalTimeString,
  getTodayString,
  formatDateTime,
  formatDateOnly,
  combineDateWithCurrentTime,
  toApprovalTimestamp,
} from "@/lib/date-utils";

describe("date-utils", () => {
  describe("toLocalDateString", () => {
    it("formats date as YYYY-MM-DD", () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(toLocalDateString(date)).toBe("2025-01-15");
    });

    it("pads single-digit month", () => {
      const date = new Date(2025, 2, 5); // Mar 5, 2025
      expect(toLocalDateString(date)).toBe("2025-03-05");
    });

    it("pads single-digit day", () => {
      const date = new Date(2025, 11, 1); // Dec 1, 2025
      expect(toLocalDateString(date)).toBe("2025-12-01");
    });

    it("handles end of year", () => {
      const date = new Date(2025, 11, 31); // Dec 31, 2025
      expect(toLocalDateString(date)).toBe("2025-12-31");
    });

    it("handles first day of year", () => {
      const date = new Date(2025, 0, 1); // Jan 1, 2025
      expect(toLocalDateString(date)).toBe("2025-01-01");
    });
  });

  describe("toLocalTimeString", () => {
    it("formats time as HH:MM", () => {
      const date = new Date(2025, 0, 15, 14, 30);
      expect(toLocalTimeString(date)).toBe("14:30");
    });

    it("pads single-digit hours", () => {
      const date = new Date(2025, 0, 15, 9, 5);
      expect(toLocalTimeString(date)).toBe("09:05");
    });

    it("handles midnight", () => {
      const date = new Date(2025, 0, 15, 0, 0);
      expect(toLocalTimeString(date)).toBe("00:00");
    });

    it("handles end of day", () => {
      const date = new Date(2025, 0, 15, 23, 59);
      expect(toLocalTimeString(date)).toBe("23:59");
    });
  });

  describe("getTodayString", () => {
    it("returns today's date as YYYY-MM-DD", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 5, 15)); // June 15, 2025
      expect(getTodayString()).toBe("2025-06-15");
      jest.useRealTimers();
    });

    it("uses current system date", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 0, 1)); // Jan 1, 2026
      expect(getTodayString()).toBe("2026-01-01");
      jest.useRealTimers();
    });
  });

  describe("formatDateTime", () => {
    it("returns empty string for null input", () => {
      expect(formatDateTime(null, "en")).toBe("");
    });

    it("formats date with default options for English locale", () => {
      const result = formatDateTime("2025-06-15T14:30:00Z", "en");
      // Should contain year, month, day, time
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("formats date for zh-CN locale", () => {
      const result = formatDateTime("2025-06-15T14:30:00Z", "zh-CN");
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("uses custom options when provided", () => {
      const result = formatDateTime("2025-06-15T14:30:00Z", "en", {
        year: "numeric",
      });
      expect(result).toContain("2025");
    });

    it("treats non-zh-CN locales as English", () => {
      const enResult = formatDateTime("2025-06-15T14:30:00Z", "en");
      const frResult = formatDateTime("2025-06-15T14:30:00Z", "fr");
      expect(enResult).toBe(frResult);
    });
  });

  describe("combineDateWithCurrentTime", () => {
    it("combines date string with current time", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 1, 15, 14, 30, 45)); // Feb 15, 2026 14:30:45
      const result = combineDateWithCurrentTime("2026-02-10");
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // Feb = 1
      expect(result.getDate()).toBe(10);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(45);
      jest.useRealTimers();
    });

    it("pads single-digit hours, minutes, and seconds", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 0, 1, 5, 3, 7)); // Jan 1, 2026 05:03:07
      const result = combineDateWithCurrentTime("2026-01-01");
      expect(result.getHours()).toBe(5);
      expect(result.getMinutes()).toBe(3);
      expect(result.getSeconds()).toBe(7);
      jest.useRealTimers();
    });

    it("uses the date from the string, not the current date", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 20, 10, 0, 0)); // June 20, 2026
      const result = combineDateWithCurrentTime("2025-12-25");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11); // Dec = 11
      expect(result.getDate()).toBe(25);
      expect(result.getHours()).toBe(10);
      jest.useRealTimers();
    });

    it("handles midnight", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
      const result = combineDateWithCurrentTime("2026-01-01");
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      jest.useRealTimers();
    });
  });

  describe("toApprovalTimestamp", () => {
    it("converts YYYY-MM-DD to noon-UTC ISO string", () => {
      const result = toApprovalTimestamp("2026-02-15");
      expect(result).toBe("2026-02-15T12:00:00.000Z");
    });

    it("falls back to current time when dateStr is undefined", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-03-01T08:30:00Z"));
      const result = toApprovalTimestamp(undefined);
      expect(result).toBe("2026-03-01T08:30:00.000Z");
      jest.useRealTimers();
    });

    it("falls back to current time when dateStr is empty string", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-01-10T14:00:00Z"));
      const result = toApprovalTimestamp("");
      expect(result).toBe("2026-01-10T14:00:00.000Z");
      jest.useRealTimers();
    });

    it("handles different date strings", () => {
      expect(toApprovalTimestamp("2025-12-31")).toBe("2025-12-31T12:00:00.000Z");
      expect(toApprovalTimestamp("2026-01-01")).toBe("2026-01-01T12:00:00.000Z");
    });
  });

  describe("formatDateOnly", () => {
    it("returns empty string for null input", () => {
      expect(formatDateOnly(null, "en")).toBe("");
    });

    it("formats date without time for English locale", () => {
      const result = formatDateOnly("2025-06-15T14:30:00Z", "en");
      expect(result).toBeTruthy();
      // Should contain year but not minutes
      expect(result).toContain("2025");
    });

    it("formats date without time for zh-CN locale", () => {
      const result = formatDateOnly("2025-06-15T14:30:00Z", "zh-CN");
      expect(result).toBeTruthy();
      expect(result).toContain("2025");
    });
  });
});
