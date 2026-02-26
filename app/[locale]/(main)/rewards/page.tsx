import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import RewardManagement from "@/components/admin/RewardManagement";
import ParentRedeemSection from "@/components/admin/ParentRedeemSection";
import RewardGrid from "@/components/child/RewardGrid";
import ChildRedemptionList from "@/components/child/ChildRedemptionList";

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);

  if (user.role === "parent") {
    return ParentRewards({ user, locale });
  }

  return ChildRewards({ user, locale });
}

// ---- Parent Rewards ----

async function ParentRewards({
  user,
  locale,
}: {
  user: any;
  locale: string;
}) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const t = await getTranslations();

  // Fetch all rewards for this family
  const { data: rewards } = await supabase
    .from("rewards")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("stars_cost", { ascending: true })
    .order("created_at", { ascending: false });

  // Fetch children in family (try adminClient first, fallback to regular client)
  let children: any[] | null = null;

  // Try admin client first (bypasses RLS)
  const adminResult = await adminClient
    .from("users")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("role", "child")
    .order("name", { ascending: true });

  if (adminResult.error) {
    console.error("Admin client error fetching children:", adminResult.error);
  } else {
    children = adminResult.data;
  }

  // Fallback to regular client if admin client returned no data
  if (!children || children.length === 0) {
    console.log("Trying regular client as fallback for children query...");
    const regularResult = await supabase
      .from("users")
      .select("*")
      .eq("family_id", user.family_id!)
      .eq("role", "child")
      .order("name", { ascending: true });

    if (regularResult.error) {
      console.error("Regular client error fetching children:", regularResult.error);
    } else if (regularResult.data && regularResult.data.length > 0) {
      children = regularResult.data;
      console.log("Found children using regular client:", children.length);
    }
  }

  // Fetch child balances (includes spendable_stars = current_stars + available_credit)
  const { data: childBalances, error: balancesError } = await adminClient
    .from("child_balances")
    .select("child_id, current_stars, spendable_stars")
    .eq("family_id", user.family_id!);

  if (balancesError) {
    console.error("Error fetching child balances:", balancesError);
  }

  // Count active and inactive rewards
  const activeRewards = rewards?.filter((r: any) => r.is_active) || [];
  const inactiveRewards = rewards?.filter((r: any) => r.is_active === false) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {t("admin.manageRewards")}
            </h1>
            <p className="text-slate-300">
              {locale === "zh-CN"
                ? "管理孩子可以兑换的奖励"
                : "Manage rewards that children can redeem"}
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">
                  {locale === "zh-CN" ? "启用的" : "Active"}
                </div>
                <div className="text-3xl font-bold text-success">
                  {activeRewards.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">
                  {locale === "zh-CN" ? "已停用" : "Inactive"}
                </div>
                <div className="text-3xl font-bold text-slate-400">
                  {inactiveRewards.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Redeem Section */}
      <ParentRedeemSection
        familyChildren={children || []}
        rewards={rewards || []}
        childBalances={(childBalances || []) as any}
        locale={locale}
        familyId={user.family_id!}
        parentId={user.id}
      />

      {/* Reward Management Component */}
      <RewardManagement
        rewards={rewards || []}
        locale={locale}
        familyId={user.family_id!}
      />
    </div>
  );
}

// ---- Child Rewards ----

async function ChildRewards({
  user,
  locale,
}: {
  user: any;
  locale: string;
}) {
  const supabase = await createClient();
  const t = await getTranslations();

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

  return (
    <div className="space-y-6">
      {/* Header with Balance */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("rewards.title")}</h1>
            <p className="text-slate-300">
              Exchange your stars for awesome rewards!
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 mb-1">
              {creditEnabled ? t("credit.canSpend") : t("dashboard.currentBalance")}
            </div>
            <div className="text-4xl font-bold text-primary">{spendableStars}</div>
            <div className="text-sm text-slate-400">{t("common.stars")}</div>
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
