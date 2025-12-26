import { useTranslations } from "next-intl";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ApprovalTabs from "@/components/admin/ApprovalTabs";

export default async function ApprovalCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();

  // Fetch pending star requests
  const { data: starRequests } = await supabase
    .from("star_transactions")
    .select(`
      *,
      users!star_transactions_child_id_fkey (
        id,
        name,
        avatar_url
      ),
      quests (
        name_en,
        name_zh,
        icon,
        category
      )
    `)
    .eq("family_id", user.family_id!)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Fetch pending redemption requests
  const { data: redemptionRequests } = await supabase
    .from("redemptions")
    .select(`
      *,
      users!redemptions_child_id_fkey (
        id,
        name,
        avatar_url
      ),
      rewards (
        name_en,
        name_zh,
        icon,
        category,
        description
      )
    `)
    .eq("family_id", user.family_id!)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const t = useTranslations();

  const totalPending =
    (starRequests?.length || 0) + (redemptionRequests?.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-warning/20 to-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {t("admin.approvalCenter")}
            </h1>
            <p className="text-gray-700">
              Review and approve requests from your children
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">
              {t("admin.pendingApprovals")}
            </div>
            <div className="text-4xl font-bold text-warning">{totalPending}</div>
          </div>
        </div>
      </div>

      {/* Approval Tabs */}
      <ApprovalTabs
        starRequests={starRequests || []}
        redemptionRequests={redemptionRequests || []}
        locale={locale}
        parentId={user.id}
      />
    </div>
  );
}
