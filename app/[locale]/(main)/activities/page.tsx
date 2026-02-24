import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import UnifiedActivityList from "@/components/shared/UnifiedActivityList";
import ActivityPageHeader from "@/components/admin/ActivityPageHeader";
import type { UnifiedActivityItem } from "@/types/activity";
import {
  transformStarTransaction,
  transformRedemption,
  sortActivitiesByDate,
  calculateActivityStats,
} from "@/lib/activity-utils";

export default async function ActivitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);

  if (user.role === "parent") {
    return ParentActivities({ user, locale });
  }

  return ChildActivities({ user, locale });
}

// ---- Parent Activities ----

async function ParentActivities({
  user,
  locale,
}: {
  user: any;
  locale: string;
}) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [
    txResult,
    redemptionResult,
    creditResult,
    childrenResult,
    questsResult,
    rewardsResult,
    balancesResult,
  ] = await Promise.all([
    adminClient
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
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: any[] | null; error: any }>,
    adminClient
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
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: any[] | null; error: any }>,
    adminClient
      .from("credit_transactions")
      .select(`
        *,
        children:users!credit_transactions_child_id_fkey (
          name,
          avatar_url
        )
      `)
      .eq("family_id", user.family_id!)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: any[] | null; error: any }>,
    adminClient
      .from("users")
      .select("*")
      .eq("family_id", user.family_id!)
      .eq("role", "child"),
    supabase
      .from("quests")
      .select("*")
      .eq("family_id", user.family_id!)
      .eq("is_active", true),
    supabase
      .from("rewards")
      .select("*")
      .eq("family_id", user.family_id!)
      .eq("is_active", true),
    adminClient
      .from("child_balances")
      .select("child_id, current_stars, spendable_stars")
      .eq("family_id", user.family_id!) as unknown as Promise<{ data: any[] | null; error: any }>,
  ]);

  const { data: transactions, error: txError } = txResult;
  const { data: redemptions, error: redemptionError } = redemptionResult;
  const { data: creditTransactions, error: creditError } = creditResult;
  const { data: familyChildren } = childrenResult;
  const { data: activeQuests } = questsResult;
  const { data: activeRewards } = rewardsResult;
  const { data: childBalances } = balancesResult;

  if (txError) {
    console.error("Error fetching transactions:", txError);
  }
  if (redemptionError) {
    console.error("Error fetching redemptions:", redemptionError);
  }
  if (creditError) {
    console.error("Error fetching credit transactions:", creditError);
  }

  // Convert to unified activity items
  const unifiedActivities: UnifiedActivityItem[] = [
    ...(transactions || []).map((tx: any) => transformStarTransaction(tx, true)),
    ...(redemptions || []).map((r: any) => transformRedemption(r, true)),
  ];

  // Calculate total credit borrowed
  const totalCreditBorrowed = (creditTransactions || [])
    .filter((ct: any) => ct.transaction_type === "credit_used")
    .reduce((sum: number, ct: any) => sum + ct.amount, 0);

  const sortedActivities = sortActivitiesByDate(unifiedActivities);
  const stats = calculateActivityStats(sortedActivities);
  const {
    totalRecords,
    positiveRecords,
    negativeRecords,
    totalStarsGiven,
    totalStarsDeducted,
    starsRedeemed,
    netStars,
  } = stats;

  return (
    <div className="space-y-6">
      <ActivityPageHeader locale={locale} />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-night-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-star-glow mb-1 relative z-10">
            {locale === "zh-CN" ? "总记录" : "Total Records"}
          </div>
          <div className="text-2xl font-bold text-white relative z-10">{totalRecords}</div>
        </div>
        <div className="stat-night-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-slate-300 mb-1 relative z-10">
            {locale === "zh-CN" ? "加分记录" : "Positive"}
          </div>
          <div className="text-2xl font-bold text-green-400 relative z-10">{positiveRecords}</div>
        </div>
        <div className="stat-night-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-slate-300 mb-1 relative z-10">
            {locale === "zh-CN" ? "扣分记录" : "Negative"}
          </div>
          <div className="text-2xl font-bold text-red-400 relative z-10">{negativeRecords}</div>
        </div>
        <div className="stat-night-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-slate-300 mb-1 relative z-10">
            {locale === "zh-CN" ? "总星星+" : "Total Stars +"}
          </div>
          <div className="text-2xl font-bold text-green-400 relative z-10">+{totalStarsGiven}</div>
        </div>
        <div className="stat-night-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-slate-300 mb-1 relative z-10">
            {locale === "zh-CN" ? "总星星-" : "Total Stars -"}
          </div>
          <div className="text-2xl font-bold text-red-400 relative z-10">{totalStarsDeducted}</div>
        </div>
        <div className="stat-night-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-purple-300 mb-1 relative z-10">
            🎁 {locale === "zh-CN" ? "星星兑换" : "Stars Redeemed"}
          </div>
          <div className="text-2xl font-bold text-purple-300 relative z-10">{starsRedeemed}</div>
        </div>
        <div className="stat-night-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-blue-300 mb-1 relative z-10">
            💳 {locale === "zh-CN" ? "信用借用" : "Credit Borrowed"}
          </div>
          <div className="text-2xl font-bold text-blue-300 relative z-10">{totalCreditBorrowed}</div>
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

      <UnifiedActivityList
        activities={sortedActivities}
        locale={locale}
        role="parent"
        quests={activeQuests || []}
        familyChildren={familyChildren || []}
        currentUserId={user.id}
        familyId={user.family_id!}
        rewards={activeRewards || []}
        childBalances={childBalances || []}
      />
    </div>
  );
}

// ---- Child Activities ----

async function ChildActivities({
  user,
  locale,
}: {
  user: any;
  locale: string;
}) {
  const supabase = await createClient();
  const t = await getTranslations();

  const [txResult, questsResult] = await Promise.all([
    supabase
      .from("star_transactions")
      .select(`
        *,
        quests (
          name_en,
          name_zh,
          icon,
          category
        )
      `)
      .eq("child_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quests")
      .select("*")
      .eq("family_id", user.family_id!)
      .eq("is_active", true)
      .eq("type", "bonus"),
  ]);

  const { data: transactions, error } = txResult;
  const { data: bonusQuests } = questsResult;

  if (error) {
    console.error("Error fetching transactions:", error);
  }

  const unifiedActivities = (transactions || []).map((tx: any) =>
    transformStarTransaction(tx, false)
  );
  const sortedActivities = sortActivitiesByDate(unifiedActivities);

  return (
    <div className="space-y-6">
      <div className="dark-card rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-2">{t("common.activities")}</h1>
        <p className="text-slate-400">
          {locale === "zh-CN"
            ? "查看所有星星的获得和扣除记录"
            : "Track all your star earnings and deductions"}
        </p>
      </div>

      <UnifiedActivityList
        activities={sortedActivities}
        locale={locale}
        role="child"
        quests={bonusQuests || []}
        currentUserId={user.id}
        familyId={user.family_id!}
      />
    </div>
  );
}
