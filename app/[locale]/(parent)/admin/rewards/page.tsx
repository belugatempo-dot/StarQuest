import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RewardManagement from "@/components/admin/RewardManagement";
import ParentRedeemSection from "@/components/admin/ParentRedeemSection";

export default async function RewardManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();

  // Fetch all rewards for this family
  const { data: rewards } = await supabase
    .from("rewards")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("stars_cost", { ascending: true })
    .order("created_at", { ascending: false });

  // Fetch children in family
  const { data: children } = await supabase
    .from("users")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("role", "child")
    .order("name", { ascending: true });

  // Fetch child balances (includes spendable_stars = current_stars + available_credit)
  const { data: childBalances } = await supabase
    .from("child_balances")
    .select("child_id, current_stars, spendable_stars")
    .eq("family_id", user.family_id!);

  const t = await getTranslations();

  // Count active and inactive rewards
  const activeRewards = rewards?.filter((r: any) => r.is_active) || [];
  const inactiveRewards = rewards?.filter((r: any) => r.is_active === false) || [];

  // Calculate total spendable stars for all children (includes credit)
  const totalSpendableStars = (childBalances || []).reduce(
    (sum: number, b: any) => sum + (b.spendable_stars || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {t("admin.manageRewards")}
            </h1>
            <p className="text-gray-700">
              {locale === "zh-CN"
                ? "管理孩子可以兑换的奖励"
                : "Manage rewards that children can redeem"}
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  {locale === "zh-CN" ? "启用的" : "Active"}
                </div>
                <div className="text-3xl font-bold text-success">
                  {activeRewards.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  {locale === "zh-CN" ? "已停用" : "Inactive"}
                </div>
                <div className="text-3xl font-bold text-gray-500">
                  {inactiveRewards.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  {locale === "zh-CN" ? "可用星星" : "Available ⭐"}
                </div>
                <div className="text-3xl font-bold text-primary">
                  {totalSpendableStars}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Redeem Section */}
      <ParentRedeemSection
        children={children || []}
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
