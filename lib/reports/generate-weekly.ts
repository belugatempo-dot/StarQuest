import type {
  WeeklyReportData,
  ReportLocale,
} from "@/types/reports";
import { fetchReportBaseData, buildChildrenStats } from "./report-utils";

/**
 * Get the start and end of a week (Sunday to Saturday)
 */
export function getWeekBounds(date: Date = new Date()): {
  weekStart: Date;
  weekEnd: Date;
} {
  const d = new Date(date);
  // Get the previous Sunday
  const dayOfWeek = d.getUTCDay();
  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() - dayOfWeek - 7); // Previous week's Sunday
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6); // Saturday
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Generate weekly report data for a family
 */
export async function generateWeeklyReportData(
  familyId: string,
  weekStart: Date,
  weekEnd: Date,
  locale: ReportLocale = "en"
): Promise<WeeklyReportData | null> {
  const rawData = await fetchReportBaseData(familyId, weekStart, weekEnd);

  if (!rawData) return null;

  if (rawData.children.length === 0) {
    return {
      familyId,
      familyName: rawData.family.name,
      locale,
      periodStart: weekStart,
      periodEnd: weekEnd,
      children: [],
      totalStarsEarned: 0,
      totalStarsSpent: 0,
    };
  }

  const { childrenData, totalEarned, totalSpent } = buildChildrenStats(rawData, locale);

  return {
    familyId,
    familyName: rawData.family.name,
    locale,
    periodStart: weekStart,
    periodEnd: weekEnd,
    children: childrenData,
    totalStarsEarned: totalEarned,
    totalStarsSpent: totalSpent,
  };
}
