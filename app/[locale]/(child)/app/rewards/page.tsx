import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RewardGrid from "@/components/child/RewardGrid";

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const supabase = await createClient();

  // Fetch active rewards
  const { data: rewards, error } = await supabase
    .from("rewards")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching rewards:", error);
  }

  // Fetch child's current balance
  const { data: balance } = await supabase
    .from("child_balances")
    .select("current_stars")
    .eq("child_id", user.id)
    .maybeSingle();

  const currentStars = (balance as any)?.current_stars || 0;

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      {/* Header with Balance */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("rewards.title")}</h1>
            <p className="text-gray-700">
              Exchange your stars for awesome rewards!
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">
              {t("dashboard.currentBalance")}
            </div>
            <div className="text-4xl font-bold text-primary">{currentStars}</div>
            <div className="text-sm text-gray-600">{t("common.stars")}</div>
          </div>
        </div>
      </div>

      {/* Reward Grid */}
      <RewardGrid
        rewards={rewards || []}
        currentStars={currentStars}
        locale={locale}
        userId={user.id}
      />
    </div>
  );
}
