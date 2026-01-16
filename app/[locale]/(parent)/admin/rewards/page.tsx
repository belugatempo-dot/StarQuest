import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RewardManagement from "@/components/admin/RewardManagement";

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

  const t = await getTranslations();

  // Count active and inactive rewards
  const activeRewards = rewards?.filter((r: any) => r.is_active) || [];
  const inactiveRewards = rewards?.filter((r: any) => r.is_active === false) || [];

  // Calculate total stars needed for all active rewards
  const totalStars = activeRewards.reduce((sum: number, r: any) => sum + r.stars_cost, 0);

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
                  {locale === "zh-CN" ? "总星星" : "Total Stars"}
                </div>
                <div className="text-3xl font-bold text-primary">
                  {totalStars}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Management Component */}
      <RewardManagement
        rewards={rewards || []}
        locale={locale}
        familyId={user.family_id!}
      />
    </div>
  );
}
