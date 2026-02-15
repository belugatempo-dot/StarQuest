import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import InviteParentCard from "@/components/admin/InviteParentCard";
import FamilyMemberList from "@/components/admin/FamilyMemberList";
import ApprovalTabs from "@/components/admin/ApprovalTabs";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const t = await getTranslations();
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Fetch pending star requests (full data for approval tabs)
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

  // Fetch pending redemption requests (full data for approval tabs)
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

  const totalPending =
    (starRequests?.length || 0) + (redemptionRequests?.length || 0);

  // Fetch all family members using admin client (with fallback)
  let members: any[] | null = null;

  const adminResult = await adminClient
    .from("users")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("role", { ascending: false })
    .order("created_at", { ascending: true });

  if (adminResult.error) {
    console.error("Admin client error fetching family members:", adminResult.error);
  } else {
    members = adminResult.data;
  }

  // Fallback to regular client if admin client returned no data
  if (!members || members.length === 0) {
    console.log("Trying regular client as fallback for members query...");
    const regularResult = await supabase
      .from("users")
      .select("*")
      .eq("family_id", user.family_id!)
      .order("role", { ascending: false })
      .order("created_at", { ascending: true });

    if (regularResult.error) {
      console.error("Regular client error fetching family members:", regularResult.error);
    } else if (regularResult.data && regularResult.data.length > 0) {
      members = regularResult.data;
      console.log("Found members using regular client:", members.length);
    }
  }

  // Fetch family info
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("*")
    .eq("id", user.family_id!)
    .maybeSingle();

  if (familyError) {
    console.error("Error fetching family:", familyError);
  }

  // Separate parents and children from members
  const parents = members?.filter((m: any) => m.role === "parent") || [];
  const children = members?.filter((m: any) => m.role === "child") || [];

  const parentsCount = parents.length;
  const childrenCount = children.length;
  const totalFamilyMembers = parentsCount + childrenCount;

  // Fetch children balances
  const { data: balances } = await adminClient
    .from("child_balances")
    .select("*")
    .eq("family_id", user.family_id!);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-secondary/20 to-primary/20 rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {user.name}!
        </h1>
        <p className="text-slate-400">
          Manage your family&apos;s quest progress and rewards
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Approvals */}
        <a href="#approval-center">
          <div className="dark-card rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-300">
                {t("admin.pendingApprovals")}
              </h3>
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-4xl font-bold text-warning">{totalPending}</p>
            <p className="text-sm text-slate-400 mt-1">
              {starRequests?.length || 0} stars, {redemptionRequests?.length || 0} redemptions
            </p>
          </div>
        </a>

        {/* Family Members */}
        <a href="#family-management">
          <div className="dark-card rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-300">
                {locale === "zh-CN" ? "家庭成员" : "Family Members"}
              </h3>
              <span className="text-3xl">👥</span>
            </div>
            <p className="text-4xl font-bold text-secondary">{totalFamilyMembers}</p>
            <p className="text-sm text-slate-400 mt-1">
              {parentsCount} {locale === "zh-CN" ? "家长" : (parentsCount === 1 ? "parent" : "parents")}, {childrenCount} {locale === "zh-CN" ? "孩子" : (childrenCount === 1 ? "child" : "children")}
            </p>
          </div>
        </a>

        {/* Quick Record */}
        <Link href={`/${locale}/admin/record`}>
          <div className="dark-card rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-300">
                Quick Record
              </h3>
              <span className="text-3xl">⚡</span>
            </div>
            <p className="text-xl font-semibold text-primary mt-4">
              {t("admin.recordStars")}
            </p>
            <p className="text-sm text-slate-400 mt-1">Click to add stars</p>
          </div>
        </Link>

        {/* Credit Management */}
        <Link href={`/${locale}/admin/credit`}>
          <div className="dark-card rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-300">
                Credit Management
              </h3>
              <span className="text-3xl">💳</span>
            </div>
            <p className="text-xl font-semibold text-purple-300 mt-4">
              {locale === "zh-CN" ? "信用管理" : "Manage Credit"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {locale === "zh-CN" ? "设置额度和利率" : "Set limits & rates"}
            </p>
          </div>
        </Link>

        {/* Invite Parent */}
        <InviteParentCard familyId={user.family_id!} locale={locale} />
      </div>

      {/* Approval Center Section */}
      {totalPending > 0 && (
        <div id="approval-center">
          <div className="bg-gradient-to-r from-warning/20 to-primary/20 rounded-lg p-6 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {t("admin.approvalCenter")}
                </h2>
                <p className="text-slate-300">
                  Review and approve requests from your children
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400 mb-1">
                  {t("admin.pendingApprovals")}
                </div>
                <div className="text-4xl font-bold text-warning">{totalPending}</div>
              </div>
            </div>
          </div>
          <ApprovalTabs
            starRequests={starRequests || []}
            redemptionRequests={redemptionRequests || []}
            locale={locale}
            parentId={user.id}
          />
        </div>
      )}

      {/* Children Overview */}
      <div className="dark-card rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Children Overview</h2>
        {children && children.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child: any) => {
              const balance = balances?.find((b: any) => b.child_id === child.id);
              return (
                <Link
                  key={child.id}
                  href={`/${locale}/admin/children/${child.id}`}
                  className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg hover:shadow-lg transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-2xl">
                      {child.avatar_url || "👤"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{child.name}</h3>
                      <p className="text-sm text-slate-400">
                        Level {(balance as any)?.lifetime_stars || 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-slate-400">Current Stars</p>
                      <p className="text-2xl font-bold text-primary">
                        {(balance as any)?.current_stars || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Lifetime</p>
                      <p className="text-xl font-semibold text-success">
                        {(balance as any)?.lifetime_stars || 0}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No children added yet</p>
          </div>
        )}
      </div>

      {/* Family Management Section */}
      <div id="family-management">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-1">
            {t("family.title")}
          </h2>
          <p className="text-slate-400">
            {t("family.subtitle")}: <span className="font-semibold">{(family as any)?.name}</span>
          </p>
        </div>
        <FamilyMemberList
          parents={parents}
          children={children}
          currentUser={user}
          locale={locale}
        />
      </div>
    </div>
  );
}
