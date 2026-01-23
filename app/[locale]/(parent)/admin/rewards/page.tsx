import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  const adminClient = createAdminClient();

  // Fetch all rewards for this family
  const { data: rewards } = await supabase
    .from("rewards")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("stars_cost", { ascending: true })
    .order("created_at", { ascending: false });

  // Fetch children in family (try adminClient first, fallback to regular client)
  let children: any[] | null = null;
  let childrenError: any = null;

  // Try admin client first (bypasses RLS)
  const adminResult = await adminClient
    .from("users")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("role", "child")
    .order("name", { ascending: true });

  if (adminResult.error) {
    console.error("Admin client error fetching children:", adminResult.error);
    childrenError = adminResult.error;
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

  const t = await getTranslations();

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
