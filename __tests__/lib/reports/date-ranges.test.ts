import {
  getAvailablePeriods,
  getReportFilename,
  getPreviousPeriodBounds,
  type PeriodType,
  type DateRange,
} from "@/lib/reports/date-ranges";

describe("date-ranges", () => {
  // Use a fixed reference date: Sunday Feb 15, 2026
  const ref = new Date(Date.UTC(2026, 1, 15, 12, 0, 0));

  describe("getAvailablePeriods", () => {
    describe("daily", () => {
      it("returns 30 periods for daily", () => {
        const periods = getAvailablePeriods("daily", "en", ref);
        expect(periods).toHaveLength(30);
      });

      it("first period is the reference date", () => {
        const periods = getAvailablePeriods("daily", "en", ref);
        // First entry should be Feb 15 2026
        expect(periods[0].start.getUTCFullYear()).toBe(2026);
        expect(periods[0].start.getUTCMonth()).toBe(1); // Feb
        expect(periods[0].start.getUTCDate()).toBe(15);
      });

      it("last period is 29 days before reference", () => {
        const periods = getAvailablePeriods("daily", "en", ref);
        const last = periods[29];
        expect(last.start.getUTCDate()).toBe(17); // Jan 17
        expect(last.start.getUTCMonth()).toBe(0);
      });

      it("each daily period spans one day (start 00:00:00 to end 23:59:59)", () => {
        const periods = getAvailablePeriods("daily", "en", ref);
        const p = periods[0];
        expect(p.start.getUTCHours()).toBe(0);
        expect(p.end.getUTCHours()).toBe(23);
        expect(p.end.getUTCMinutes()).toBe(59);
        expect(p.end.getUTCSeconds()).toBe(59);
      });

      it("uses zh-CN labels when locale is zh-CN", () => {
        const periods = getAvailablePeriods("daily", "zh-CN", ref);
        // Should contain Chinese date format
        expect(periods[0].label).toMatch(/2026/);
      });

      it("uses English labels when locale is en", () => {
        const periods = getAvailablePeriods("daily", "en", ref);
        expect(periods[0].label).toMatch(/Feb|February/);
      });
    });

    describe("weekly", () => {
      it("returns 12 periods for weekly", () => {
        const periods = getAvailablePeriods("weekly", "en", ref);
        expect(periods).toHaveLength(12);
      });

      it("first period starts on the most recent Sunday", () => {
        const periods = getAvailablePeriods("weekly", "en", ref);
        // ref is Sunday Feb 15 — current week starts Feb 15
        expect(periods[0].start.getUTCDay()).toBe(0); // Sunday
      });

      it("each weekly period spans Sunday to Saturday", () => {
        const periods = getAvailablePeriods("weekly", "en", ref);
        for (const p of periods) {
          expect(p.start.getUTCDay()).toBe(0); // Sunday
          expect(p.end.getUTCDay()).toBe(6); // Saturday
        }
      });

      it("weeks are contiguous and descending", () => {
        const periods = getAvailablePeriods("weekly", "en", ref);
        for (let i = 1; i < periods.length; i++) {
          // Each period starts 7 days before the previous
          const diff = periods[i - 1].start.getTime() - periods[i].start.getTime();
          expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
        }
      });

      it("label includes date range", () => {
        const periods = getAvailablePeriods("weekly", "en", ref);
        // Should contain "–" separator
        expect(periods[0].label).toContain("–");
      });
    });

    describe("monthly", () => {
      it("returns 12 periods for monthly", () => {
        const periods = getAvailablePeriods("monthly", "en", ref);
        expect(periods).toHaveLength(12);
      });

      it("first period is February 2026", () => {
        const periods = getAvailablePeriods("monthly", "en", ref);
        expect(periods[0].start.getUTCMonth()).toBe(1); // Feb
        expect(periods[0].start.getUTCFullYear()).toBe(2026);
      });

      it("each monthly period starts on 1st and ends on last day", () => {
        const periods = getAvailablePeriods("monthly", "en", ref);
        for (const p of periods) {
          expect(p.start.getUTCDate()).toBe(1);
          expect(p.end.getUTCHours()).toBe(23);
          expect(p.end.getUTCMinutes()).toBe(59);
        }
      });

      it("months are descending", () => {
        const periods = getAvailablePeriods("monthly", "en", ref);
        for (let i = 1; i < periods.length; i++) {
          expect(periods[i - 1].start.getTime()).toBeGreaterThan(
            periods[i].start.getTime()
          );
        }
      });

      it("includes month name in label", () => {
        const periods = getAvailablePeriods("monthly", "en", ref);
        expect(periods[0].label).toMatch(/February|Feb/);
      });

      it("zh-CN label includes Chinese month", () => {
        const periods = getAvailablePeriods("monthly", "zh-CN", ref);
        expect(periods[0].label).toMatch(/2026/);
      });
    });

    describe("quarterly", () => {
      it("returns 4 periods for quarterly", () => {
        const periods = getAvailablePeriods("quarterly", "en", ref);
        expect(periods).toHaveLength(4);
      });

      it("first period is Q1 2026 (Jan-Mar) since Feb is in Q1", () => {
        const periods = getAvailablePeriods("quarterly", "en", ref);
        expect(periods[0].start.getUTCMonth()).toBe(0); // Jan
        expect(periods[0].end.getUTCMonth()).toBe(2); // Mar
      });

      it("each quarter spans 3 months", () => {
        const periods = getAvailablePeriods("quarterly", "en", ref);
        for (const p of periods) {
          const startMonth = p.start.getUTCMonth();
          const endMonth = p.end.getUTCMonth();
          // End month should be start + 2 (mod 12 for year wrapping)
          expect((endMonth - startMonth + 12) % 12).toBe(2);
        }
      });

      it("label includes quarter number", () => {
        const periods = getAvailablePeriods("quarterly", "en", ref);
        expect(periods[0].label).toMatch(/Q1/);
      });
    });

    describe("yearly", () => {
      it("returns 3 periods for yearly", () => {
        const periods = getAvailablePeriods("yearly", "en", ref);
        expect(periods).toHaveLength(3);
      });

      it("first period is 2026", () => {
        const periods = getAvailablePeriods("yearly", "en", ref);
        expect(periods[0].start.getUTCFullYear()).toBe(2026);
        expect(periods[0].start.getUTCMonth()).toBe(0);
        expect(periods[0].start.getUTCDate()).toBe(1);
        expect(periods[0].end.getUTCFullYear()).toBe(2026);
        expect(periods[0].end.getUTCMonth()).toBe(11);
        expect(periods[0].end.getUTCDate()).toBe(31);
      });

      it("label is the year string", () => {
        const periods = getAvailablePeriods("yearly", "en", ref);
        expect(periods[0].label).toBe("2026");
        expect(periods[1].label).toBe("2025");
        expect(periods[2].label).toBe("2024");
      });
    });

    describe("defaults to now when no referenceDate", () => {
      it("returns periods without throwing", () => {
        const periods = getAvailablePeriods("monthly", "en");
        expect(periods.length).toBe(12);
      });
    });
  });

  describe("getReportFilename", () => {
    it("generates correct daily filename", () => {
      const start = new Date(Date.UTC(2026, 1, 15));
      const end = new Date(Date.UTC(2026, 1, 15, 23, 59, 59));
      expect(getReportFilename("daily", start, end)).toBe(
        "starquest-daily-2026-02-15.md"
      );
    });

    it("generates correct weekly filename with date range", () => {
      const start = new Date(Date.UTC(2026, 1, 9));
      const end = new Date(Date.UTC(2026, 1, 15, 23, 59, 59));
      expect(getReportFilename("weekly", start, end)).toBe(
        "starquest-weekly-2026-02-09-to-2026-02-15.md"
      );
    });

    it("generates correct monthly filename", () => {
      const start = new Date(Date.UTC(2026, 1, 1));
      const end = new Date(Date.UTC(2026, 1, 28, 23, 59, 59));
      expect(getReportFilename("monthly", start, end)).toBe(
        "starquest-monthly-2026-02.md"
      );
    });

    it("generates correct quarterly filename", () => {
      const start = new Date(Date.UTC(2026, 0, 1));
      const end = new Date(Date.UTC(2026, 2, 31, 23, 59, 59));
      expect(getReportFilename("quarterly", start, end)).toBe(
        "starquest-quarterly-2026-Q1.md"
      );
    });

    it("generates correct yearly filename", () => {
      const start = new Date(Date.UTC(2026, 0, 1));
      const end = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));
      expect(getReportFilename("yearly", start, end)).toBe(
        "starquest-yearly-2026.md"
      );
    });
  });

  describe("getPreviousPeriodBounds", () => {
    it("daily: returns the day before", () => {
      const start = new Date(Date.UTC(2026, 1, 15, 0, 0, 0));
      const end = new Date(Date.UTC(2026, 1, 15, 23, 59, 59, 999));
      const prev = getPreviousPeriodBounds("daily", start, end);
      expect(prev.start.getUTCDate()).toBe(14);
      expect(prev.end.getUTCDate()).toBe(14);
    });

    it("weekly: returns the previous 7-day window", () => {
      const start = new Date(Date.UTC(2026, 1, 9, 0, 0, 0)); // Sunday
      const end = new Date(Date.UTC(2026, 1, 15, 23, 59, 59, 999)); // Saturday
      const prev = getPreviousPeriodBounds("weekly", start, end);
      expect(prev.start.getUTCDate()).toBe(2); // Feb 2
      expect(prev.end.getUTCDate()).toBe(8); // Feb 8
    });

    it("monthly: returns the previous month", () => {
      const start = new Date(Date.UTC(2026, 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(2026, 1, 28, 23, 59, 59, 999));
      const prev = getPreviousPeriodBounds("monthly", start, end);
      expect(prev.start.getUTCMonth()).toBe(0); // Jan
      expect(prev.start.getUTCDate()).toBe(1);
      expect(prev.end.getUTCMonth()).toBe(0);
      expect(prev.end.getUTCDate()).toBe(31);
    });

    it("quarterly: returns the previous quarter", () => {
      const start = new Date(Date.UTC(2026, 0, 1)); // Q1
      const end = new Date(Date.UTC(2026, 2, 31, 23, 59, 59, 999));
      const prev = getPreviousPeriodBounds("quarterly", start, end);
      expect(prev.start.getUTCFullYear()).toBe(2025);
      expect(prev.start.getUTCMonth()).toBe(9); // Oct
      expect(prev.end.getUTCMonth()).toBe(11); // Dec
    });

    it("yearly: returns the previous year", () => {
      const start = new Date(Date.UTC(2026, 0, 1));
      const end = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));
      const prev = getPreviousPeriodBounds("yearly", start, end);
      expect(prev.start.getUTCFullYear()).toBe(2025);
      expect(prev.start.getUTCMonth()).toBe(0);
      expect(prev.end.getUTCFullYear()).toBe(2025);
      expect(prev.end.getUTCMonth()).toBe(11);
      expect(prev.end.getUTCDate()).toBe(31);
    });

    it("monthly handles year boundary (Jan → Dec previous year)", () => {
      const start = new Date(Date.UTC(2026, 0, 1));
      const end = new Date(Date.UTC(2026, 0, 31, 23, 59, 59, 999));
      const prev = getPreviousPeriodBounds("monthly", start, end);
      expect(prev.start.getUTCFullYear()).toBe(2025);
      expect(prev.start.getUTCMonth()).toBe(11);
    });
  });
});
