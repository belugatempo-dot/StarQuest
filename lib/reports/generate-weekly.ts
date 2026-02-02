import { createAdminClient } from "@/lib/supabase/server";
import type {
  WeeklyReportData,
  ChildWeeklyData,
  QuestSummary,
  ReportLocale,
} from "@/types/reports";

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
  const supabase = createAdminClient();

  // Get family info
  const { data: family, error: familyError } = (await supabase
    .from("families")
    .select("id, name")
    .eq("id", familyId)
    .single()) as { data: { id: string; name: string } | null; error: any };

  if (familyError || !family) {
    console.error("Failed to fetch family:", familyError);
    return null;
  }

  // Get children in the family
  const { data: children, error: childrenError } = (await supabase
    .from("users")
    .select("id, name")
    .eq("family_id", familyId)
    .eq("role", "child")) as { data: { id: string; name: string }[] | null; error: any };

  if (childrenError) {
    console.error("Failed to fetch children:", childrenError);
    return null;
  }

  if (!children || children.length === 0) {
    return {
      familyId,
      familyName: family.name,
      locale,
      periodStart: weekStart,
      periodEnd: weekEnd,
      children: [],
      totalStarsEarned: 0,
      totalStarsSpent: 0,
    };
  }

  const childIds = children.map((c) => c.id);
  const startStr = weekStart.toISOString();
  const endStr = weekEnd.toISOString();

  // Get approved star transactions for the period
  const { data: transactions, error: txError } = (await supabase
    .from("star_transactions")
    .select("child_id, quest_id, stars, status, created_at, quests(name_en, name_zh)")
    .eq("family_id", familyId)
    .eq("status", "approved")
    .gte("created_at", startStr)
    .lte("created_at", endStr)
    .in("child_id", childIds)) as { data: any[] | null; error: any };

  if (txError) {
    console.error("Failed to fetch transactions:", txError);
    return null;
  }

  // Get redemptions for the period
  const { data: redemptions, error: redemptionsError } = (await supabase
    .from("redemptions")
    .select("child_id, stars_spent, status, created_at")
    .eq("family_id", familyId)
    .in("status", ["approved", "fulfilled"])
    .gte("created_at", startStr)
    .lte("created_at", endStr)
    .in("child_id", childIds)) as { data: any[] | null; error: any };

  if (redemptionsError) {
    console.error("Failed to fetch redemptions:", redemptionsError);
    return null;
  }

  // Get current balances
  const { data: balances, error: balancesError } = (await supabase
    .from("child_balances")
    .select("child_id, current_stars")
    .in("child_id", childIds)) as { data: any[] | null; error: any };

  if (balancesError) {
    console.error("Failed to fetch balances:", balancesError);
    return null;
  }

  // Get credit transactions for the period
  const { data: creditTx, error: creditTxError } = (await supabase
    .from("credit_transactions")
    .select("child_id, transaction_type, amount, created_at")
    .eq("family_id", familyId)
    .gte("created_at", startStr)
    .lte("created_at", endStr)
    .in("child_id", childIds)) as { data: any[] | null; error: any };

  if (creditTxError) {
    console.error("Failed to fetch credit transactions:", creditTxError);
    return null;
  }

  // Get pending requests count
  const { data: pendingStars } = (await supabase
    .from("star_transactions")
    .select("child_id")
    .eq("family_id", familyId)
    .eq("status", "pending")
    .in("child_id", childIds)) as { data: any[] | null };

  const { data: pendingRedemptions } = (await supabase
    .from("redemptions")
    .select("child_id")
    .eq("family_id", familyId)
    .eq("status", "pending")
    .in("child_id", childIds)) as { data: any[] | null };

  // Build per-child data
  const childrenData: ChildWeeklyData[] = [];
  let totalEarned = 0;
  let totalSpent = 0;

  for (const child of children) {
    const childTx = transactions?.filter((t) => t.child_id === child.id) || [];
    const childRedemptions =
      redemptions?.filter((r) => r.child_id === child.id) || [];
    const childCreditTx = creditTx?.filter((c) => c.child_id === child.id) || [];
    const childBalance = balances?.find((b) => b.child_id === child.id);

    // Calculate stars earned (positive transactions)
    const starsEarned = childTx
      .filter((t) => t.stars > 0)
      .reduce((sum, t) => sum + t.stars, 0);

    // Calculate stars deducted (negative transactions)
    const starsDeducted = childTx
      .filter((t) => t.stars < 0)
      .reduce((sum, t) => sum + Math.abs(t.stars), 0);

    // Calculate stars spent (redemptions)
    const starsSpent =
      childRedemptions.reduce((sum, r) => sum + r.stars_spent, 0) + starsDeducted;

    totalEarned += starsEarned;
    totalSpent += starsSpent;

    // Calculate credit borrowed/repaid
    const creditBorrowed = childCreditTx
      .filter((c) => c.transaction_type === "credit_used")
      .reduce((sum, c) => sum + c.amount, 0);

    const creditRepaid = childCreditTx
      .filter((c) => c.transaction_type === "credit_repaid")
      .reduce((sum, c) => sum + c.amount, 0);

    // Get top quests
    const questCounts: Record<string, { name: string; stars: number; count: number }> =
      {};
    for (const tx of childTx) {
      if (tx.quest_id && tx.stars > 0 && tx.quests) {
        const quest = tx.quests as { name_en: string; name_zh: string | null };
        const questName = locale === "zh-CN" && quest.name_zh ? quest.name_zh : quest.name_en;
        if (!questCounts[tx.quest_id]) {
          questCounts[tx.quest_id] = { name: questName, stars: tx.stars, count: 0 };
        }
        questCounts[tx.quest_id].count++;
      }
    }

    const topQuests: QuestSummary[] = Object.values(questCounts)
      .sort((a, b) => b.count * b.stars - a.count * a.stars)
      .slice(0, 5);

    // Count pending requests
    const pendingStarsCount =
      pendingStars?.filter((p) => p.child_id === child.id).length || 0;
    const pendingRedemptionsCount =
      pendingRedemptions?.filter((p) => p.child_id === child.id).length || 0;

    childrenData.push({
      childId: child.id,
      name: child.name,
      starsEarned,
      starsSpent,
      netStars: starsEarned - starsSpent,
      currentBalance: childBalance?.current_stars || 0,
      creditBorrowed,
      creditRepaid,
      topQuests,
      pendingRequestsCount: pendingStarsCount + pendingRedemptionsCount,
    });
  }

  return {
    familyId,
    familyName: family.name,
    locale,
    periodStart: weekStart,
    periodEnd: weekEnd,
    children: childrenData,
    totalStarsEarned: totalEarned,
    totalStarsSpent: totalSpent,
  };
}
