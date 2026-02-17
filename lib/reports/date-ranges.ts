/**
 * Date range utilities for on-demand report generation.
 * All dates use UTC to match existing report infrastructure.
 */

export type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

/** Format a UTC date as YYYY-MM-DD */
function utcDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Short locale-aware date label for a single day */
function dayLabel(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Short locale-aware label for a month+year */
function monthLabel(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * Generate selectable periods for a given period type.
 * Returns most recent first (descending).
 */
export function getAvailablePeriods(
  periodType: PeriodType,
  locale: string,
  referenceDate: Date = new Date()
): DateRange[] {
  switch (periodType) {
    case "daily":
      return getDailyPeriods(locale, referenceDate);
    case "weekly":
      return getWeeklyPeriods(locale, referenceDate);
    case "monthly":
      return getMonthlyPeriods(locale, referenceDate);
    case "quarterly":
      return getQuarterlyPeriods(locale, referenceDate);
    case "yearly":
      return getYearlyPeriods(locale, referenceDate);
  }
}

function getDailyPeriods(locale: string, ref: Date): DateRange[] {
  const periods: DateRange[] = [];
  for (let i = 0; i < 30; i++) {
    const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() - i, 0, 0, 0, 0));
    const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() - i, 23, 59, 59, 999));
    periods.push({ start, end, label: dayLabel(start, locale) });
  }
  return periods;
}

function getWeeklyPeriods(locale: string, ref: Date): DateRange[] {
  const periods: DateRange[] = [];
  // Find the Sunday of the current week
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const dayOfWeek = d.getUTCDay();
  const currentSunday = new Date(d);
  currentSunday.setUTCDate(d.getUTCDate() - dayOfWeek);

  for (let i = 0; i < 12; i++) {
    const start = new Date(currentSunday);
    start.setUTCDate(currentSunday.getUTCDate() - i * 7);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

    const label = `${dayLabel(start, locale)} – ${dayLabel(end, locale)}`;
    periods.push({ start, end, label });
  }
  return periods;
}

function getMonthlyPeriods(locale: string, ref: Date): DateRange[] {
  const periods: DateRange[] = [];
  for (let i = 0; i < 12; i++) {
    const year = ref.getUTCFullYear();
    const month = ref.getUTCMonth() - i;
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    // Last day of the month: day 0 of next month
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    periods.push({ start, end, label: monthLabel(start, locale) });
  }
  return periods;
}

function getQuarterlyPeriods(locale: string, ref: Date): DateRange[] {
  const periods: DateRange[] = [];
  const currentQuarter = Math.floor(ref.getUTCMonth() / 3);
  const year = ref.getUTCFullYear();

  for (let i = 0; i < 4; i++) {
    const totalQuarters = currentQuarter - i;
    const qYear = year + Math.floor(totalQuarters / 4) + (totalQuarters < 0 ? -1 : 0);
    const qIndex = ((totalQuarters % 4) + 4) % 4;
    const startMonth = qIndex * 3;

    const start = new Date(Date.UTC(qYear, startMonth, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(qYear, startMonth + 3, 0, 23, 59, 59, 999));

    const qNum = qIndex + 1;
    const monthNames =
      locale === "zh-CN"
        ? ["1-3月", "4-6月", "7-9月", "10-12月"]
        : ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"];
    const label = `Q${qNum} ${qYear}: ${monthNames[qIndex]}`;
    periods.push({ start, end, label });
  }
  return periods;
}

function getYearlyPeriods(_locale: string, ref: Date): DateRange[] {
  const periods: DateRange[] = [];
  const year = ref.getUTCFullYear();
  for (let i = 0; i < 3; i++) {
    const y = year - i;
    const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    periods.push({ start, end, label: String(y) });
  }
  return periods;
}

/**
 * Generate a report filename.
 * e.g. "starquest-weekly-2026-02-09-to-2026-02-15.md"
 */
export function getReportFilename(
  periodType: PeriodType,
  start: Date,
  end: Date
): string {
  const prefix = `starquest-${periodType}`;
  switch (periodType) {
    case "daily":
      return `${prefix}-${utcDateStr(start)}.md`;
    case "weekly":
      return `${prefix}-${utcDateStr(start)}-to-${utcDateStr(end)}.md`;
    case "monthly": {
      const y = start.getUTCFullYear();
      const m = String(start.getUTCMonth() + 1).padStart(2, "0");
      return `${prefix}-${y}-${m}.md`;
    }
    case "quarterly": {
      const y = start.getUTCFullYear();
      const q = Math.floor(start.getUTCMonth() / 3) + 1;
      return `${prefix}-${y}-Q${q}.md`;
    }
    case "yearly":
      return `${prefix}-${start.getUTCFullYear()}.md`;
  }
}

/**
 * Get the bounds of the previous period for comparison.
 */
export function getPreviousPeriodBounds(
  periodType: PeriodType,
  start: Date,
  end: Date
): { start: Date; end: Date } {
  switch (periodType) {
    case "daily": {
      const prevStart = new Date(start);
      prevStart.setUTCDate(prevStart.getUTCDate() - 1);
      prevStart.setUTCHours(0, 0, 0, 0);
      const prevEnd = new Date(prevStart);
      prevEnd.setUTCHours(23, 59, 59, 999);
      return { start: prevStart, end: prevEnd };
    }
    case "weekly": {
      const prevStart = new Date(start);
      prevStart.setUTCDate(prevStart.getUTCDate() - 7);
      prevStart.setUTCHours(0, 0, 0, 0);
      const prevEnd = new Date(prevStart);
      prevEnd.setUTCDate(prevStart.getUTCDate() + 6);
      prevEnd.setUTCHours(23, 59, 59, 999);
      return { start: prevStart, end: prevEnd };
    }
    case "monthly": {
      const prevStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      const prevEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0, 23, 59, 59, 999));
      return { start: prevStart, end: prevEnd };
    }
    case "quarterly": {
      const prevStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 3, 1, 0, 0, 0, 0));
      const prevEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0, 23, 59, 59, 999));
      return { start: prevStart, end: prevEnd };
    }
    case "yearly": {
      const y = start.getUTCFullYear() - 1;
      return {
        start: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
      };
    }
  }
}
