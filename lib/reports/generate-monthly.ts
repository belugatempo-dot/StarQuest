import { createAdminClient } from "@/lib/supabase/server";
import type {
  MonthlyReportData,
  ChildSettlementData,
  InterestTierBreakdown,
  ReportLocale,
} from "@/types/reports";
import { fetchReportBaseData, buildChildrenStats } from "./report-utils";

/**
 * Get the start and end of a month
 */
export function getMonthBounds(date: Date = new Date()): {
  monthStart: Date;
  monthEnd: Date;
} {
  const d = new Date(date);

  // Start of current month
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

  // End of current month
  const monthEnd = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );

  return { monthStart, monthEnd };
}

/**
 * Get previous month bounds for comparison
 */
export function getPreviousMonthBounds(date: Date = new Date()): {
  monthStart: Date;
  monthEnd: Date;
} {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return getMonthBounds(d);
}

/**
 * Generate monthly report data for a family
 */
export async function generateMonthlyReportData(
  familyId: string,
  monthStart: Date,
  monthEnd: Date,
  locale: ReportLocale = "en"
): Promise<MonthlyReportData | null> {
  const rawData = await fetchReportBaseData(familyId, monthStart, monthEnd);

  if (!rawData) return null;

  if (rawData.children.length === 0) {
    return {
      familyId,
      familyName: rawData.family.name,
      locale,
      periodStart: monthStart,
      periodEnd: monthEnd,
      children: [],
      totalStarsEarned: 0,
      totalStarsSpent: 0,
    };
  }

  const { childrenData, totalEarned, totalSpent } = buildChildrenStats(rawData, locale);

  // Monthly-specific: fetch settlement data
  const supabase = createAdminClient();
  const childIds = rawData.children.map((c) => c.id);
  const startStr = monthStart.toISOString().split("T")[0];
  const endStr = monthEnd.toISOString().split("T")[0];

  const { data: settlements, error: settlementsError } = (await supabase
    .from("credit_settlements")
    .select("*")
    .eq("family_id", familyId)
    .gte("settlement_date", startStr)
    .lte("settlement_date", endStr)
    .in("child_id", childIds)) as { data: any[] | null; error: any };

  if (settlementsError) {
    console.error("Failed to fetch settlements:", settlementsError);
  }

  // Build settlement data
  const settlementData: ChildSettlementData[] = [];
  for (const child of rawData.children) {
    const childSettlement = settlements?.find((s) => s.child_id === child.id);
    if (childSettlement) {
      const interestBreakdown: InterestTierBreakdown[] =
        Array.isArray(childSettlement.interest_breakdown)
          ? childSettlement.interest_breakdown.map((tier: any) => ({
              tierOrder: tier.tier_order || 0,
              minDebt: tier.min_debt || 0,
              maxDebt: tier.max_debt || null,
              debtInTier: tier.debt_in_tier || 0,
              rate: tier.interest_rate || 0,
              interestAmount: tier.interest_amount || 0,
            }))
          : [];

      settlementData.push({
        childId: child.id,
        name: child.name,
        debtAmount: childSettlement.debt_amount,
        interestCharged: childSettlement.interest_calculated,
        interestBreakdown,
        creditLimitBefore: childSettlement.credit_limit_before,
        creditLimitAfter: childSettlement.credit_limit_after,
        creditLimitChange: childSettlement.credit_limit_adjustment,
      });
    }
  }

  // Monthly-specific: previous month comparison
  const { monthStart: prevStart, monthEnd: prevEnd } = getPreviousMonthBounds(monthStart);
  const prevStartStr = prevStart.toISOString();
  const prevEndStr = prevEnd.toISOString();

  const { data: prevTransactions } = (await supabase
    .from("star_transactions")
    .select("stars")
    .eq("family_id", familyId)
    .eq("status", "approved")
    .gte("created_at", prevStartStr)
    .lte("created_at", prevEndStr)
    .in("child_id", childIds)) as { data: any[] | null };

  const { data: prevRedemptions } = (await supabase
    .from("redemptions")
    .select("stars_spent")
    .eq("family_id", familyId)
    .in("status", ["approved", "fulfilled"])
    .gte("created_at", prevStartStr)
    .lte("created_at", prevEndStr)
    .in("child_id", childIds)) as { data: any[] | null };

  let previousMonthComparison;
  if (prevTransactions && prevRedemptions) {
    const prevEarned = prevTransactions
      .filter((t) => t.stars > 0)
      .reduce((sum, t) => sum + t.stars, 0);
    const prevDeducted = prevTransactions
      .filter((t) => t.stars < 0)
      .reduce((sum, t) => sum + Math.abs(t.stars), 0);
    const prevSpent =
      prevRedemptions.reduce((sum, r) => sum + r.stars_spent, 0) + prevDeducted;

    if (prevEarned > 0 || prevSpent > 0) {
      previousMonthComparison = {
        starsEarnedChange:
          prevEarned > 0
            ? Math.round(((totalEarned - prevEarned) / prevEarned) * 100)
            : totalEarned > 0
              ? 100
              : 0,
        starsSpentChange:
          prevSpent > 0
            ? Math.round(((totalSpent - prevSpent) / prevSpent) * 100)
            : totalSpent > 0
              ? 100
              : 0,
      };
    }
  }

  return {
    familyId,
    familyName: rawData.family.name,
    locale,
    periodStart: monthStart,
    periodEnd: monthEnd,
    children: childrenData,
    totalStarsEarned: totalEarned,
    totalStarsSpent: totalSpent,
    settlementData: settlementData.length > 0 ? settlementData : undefined,
    previousMonthComparison,
  };
}
