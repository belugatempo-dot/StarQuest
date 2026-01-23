import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RewardGrid from "@/components/child/RewardGrid";
import ChildRedemptionList from "@/components/child/ChildRedemptionList";

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

  // Fetch child's recent redemption requests (pending, approved in last 7 days, or rejected in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: redemptions } = await supabase
    .from("redemptions")
    .select(`
      *,
      rewards (
        name_en,
        name_zh,
        icon,
        category
      )
    `)
    .eq("child_id", user.id)
    .or(`status.eq.pending,and(status.in.(approved,rejected),created_at.gte.${sevenDaysAgo.toISOString()})`)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch child's balance including credit info
  const { data: balance } = await supabase
    .from("child_balances")
    .select("*")
    .eq("child_id", user.id)
    .maybeSingle();

  const currentStars = (balance as any)?.current_stars || 0;
  const spendableStars = (balance as any)?.spendable_stars || 0;
  const creditEnabled = (balance as any)?.credit_enabled || false;
  const creditLimit = (balance as any)?.credit_limit || 0;
  const creditUsed = (balance as any)?.credit_used || 0;
  const availableCredit = (balance as any)?.available_credit || 0;

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
              {creditEnabled ? t("credit.canSpend") : t("dashboard.currentBalance")}
            </div>
            <div className="text-4xl font-bold text-primary">{spendableStars}</div>
            <div className="text-sm text-gray-600">{t("common.stars")}</div>
            {creditEnabled && availableCredit > 0 && (
              <div className="text-xs text-secondary mt-1">
                ({t("credit.includesCredit", { amount: availableCredit })})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Child's Redemption Requests */}
      <ChildRedemptionList
        redemptions={(redemptions as any) || []}
        locale={locale}
      />

      {/* Reward Grid */}
      <RewardGrid
        rewards={rewards || []}
        currentStars={currentStars}
        spendableStars={spendableStars}
        creditEnabled={creditEnabled}
        creditLimit={creditLimit}
        creditUsed={creditUsed}
        availableCredit={availableCredit}
        locale={locale}
        userId={user.id}
      />
    </div>
  );
}
