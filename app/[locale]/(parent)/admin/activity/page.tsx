import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import UnifiedActivityList from "@/components/shared/UnifiedActivityList";
import type { UnifiedActivityItem } from "@/types/activity";
import {
  transformStarTransaction,
  transformRedemption,
  sortActivitiesByDate,
  calculateActivityStats,
} from "@/lib/activity-utils";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Fetch all star transactions for the family with quest and child details
  const { data: transactions, error: txError } = (await adminClient
    .from("star_transactions")
    .select(`
      *,
      quests (
        name_en,
        name_zh,
        icon,
        category
      ),
      children:users!star_transactions_child_id_fkey (
        name,
        avatar_url
      )
    `)
    .eq("family_id", user.family_id!)
    .order("created_at", { ascending: false })) as { data: any[] | null; error: any };

  if (txError) {
    console.error("Error fetching transactions:", txError);
  }

  // Fetch all redemptions with reward and child details
  const { data: redemptions, error: redemptionError } = (await adminClient
    .from("redemptions")
    .select(`
      *,
      rewards (
        name_en,
        name_zh,
        icon,
        category
      ),
      children:users!redemptions_child_id_fkey (
        name,
        avatar_url
      )
    `)
    .eq("family_id", user.family_id!)
    .order("created_at", { ascending: false })) as { data: any[] | null; error: any };

  if (redemptionError) {
    console.error("Error fetching redemptions:", redemptionError);
  }

  // Fetch all credit transactions with child details
  const { data: creditTransactions, error: creditError } = (await adminClient
    .from("credit_transactions")
    .select(`
      *,
      children:users!credit_transactions_child_id_fkey (
        name,
        avatar_url
      )
    `)
    .eq("family_id", user.family_id!)
    .order("created_at", { ascending: false })) as { data: any[] | null; error: any };

  if (creditError) {
    console.error("Error fetching credit transactions:", creditError);
  }

  const t = await getTranslations();

  // Convert to unified activity items using utility functions
  // Credit transactions are not shown in activity list - only displayed as a summary tile
  const unifiedActivities: UnifiedActivityItem[] = [
    ...(transactions || []).map((tx: any) => transformStarTransaction(tx, true)),
    ...(redemptions || []).map((r: any) => transformRedemption(r, true)),
  ];

  // Calculate total credit borrowed (credit_used transactions)
  const totalCreditBorrowed = (creditTransactions || [])
    .filter((ct: any) => ct.transaction_type === 'credit_used')
    .reduce((sum: number, ct: any) => sum + ct.amount, 0);

  // Sort all activities by created_at descending
  const sortedActivities = sortActivitiesByDate(unifiedActivities);

  // Calculate statistics using utility function
  const stats = calculateActivityStats(sortedActivities);
  const {
    totalRecords,
    positiveRecords,
    negativeRecords,
    totalStarsGiven,
    totalStarsDeducted,
    netStars,
  } = stats;

  return (
    <div className="space-y-6">
      {/* Header - Starry Night Theme */}
      <div className="night-header rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-white star-glow relative z-10">
          ✨ {locale === "zh-CN" ? "活动记录" : "Activity Log"}
        </h1>
        <p className="text-white/80 relative z-10">
          {locale === "zh-CN"
            ? "查看所有记录的星星活动，按日期和类型筛选"
            : "View all recorded star activities, filter by date and type"}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "总记录" : "Total Records"}
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalRecords}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "加分记录" : "Positive"}
          </div>
          <div className="text-2xl font-bold text-green-600">{positiveRecords}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "扣分记录" : "Negative"}
          </div>
          <div className="text-2xl font-bold text-red-600">{negativeRecords}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "总星星+" : "Total Stars +"}
          </div>
          <div className="text-2xl font-bold text-green-600">+{totalStarsGiven}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "总星星-" : "Total Stars -"}
          </div>
          <div className="text-2xl font-bold text-red-600">{totalStarsDeducted}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4 border-2 border-blue-200 bg-blue-50">
          <div className="text-sm text-blue-600 mb-1">
            💳 {locale === "zh-CN" ? "信用借用" : "Credit Borrowed"}
          </div>
          <div className="text-2xl font-bold text-blue-600">{totalCreditBorrowed}</div>
        </div>
        <div className="net-stars-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-star-glow mb-1 relative z-10">
            ⭐ {locale === "zh-CN" ? "净值" : "Net Stars"}
          </div>
          <div className={`text-2xl font-bold relative z-10 star-glow ${netStars >= 0 ? "text-green-400" : "text-red-400"}`}>
            {netStars >= 0 ? `+${netStars}` : netStars}
          </div>
        </div>
      </div>

      {/* Activity List with Filters */}
      <UnifiedActivityList activities={sortedActivities} locale={locale} role="parent" />
    </div>
  );
}
