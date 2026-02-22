import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import UnifiedActivityList from "@/components/shared/UnifiedActivityList";
import { transformStarTransaction, sortActivitiesByDate } from "@/lib/activity-utils";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const supabase = await createClient();

  // Fetch all transactions for the child
  const { data: transactions, error } = await supabase
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
  }

  // Fetch bonus quests for add-record modal
  const { data: bonusQuests } = await supabase
    .from("quests")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("is_active", true)
    .eq("type", "bonus");

  const t = await getTranslations();

  // Transform transactions to unified format
  const unifiedActivities = (transactions || []).map((tx: any) =>
    transformStarTransaction(tx, false)
  );
  const sortedActivities = sortActivitiesByDate(unifiedActivities);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dark-card rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-2">{t("common.activities")}</h1>
        <p className="text-slate-400">
          {locale === "zh-CN"
            ? "查看所有星星的获得和扣除记录"
            : "Track all your star earnings and deductions"}
        </p>
      </div>

      {/* Activity List */}
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
