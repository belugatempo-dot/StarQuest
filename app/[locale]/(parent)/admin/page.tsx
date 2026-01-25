import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import InviteParentCard from "@/components/admin/InviteParentCard";

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

  // Fetch pending approvals count
  const { count: pendingStarsCount } = await supabase
    .from("star_transactions")
    .select("*", { count: "exact", head: true })
    .eq("family_id", user.family_id!)
    .eq("status", "pending");

  const { count: pendingRedemptionsCount } = await supabase
    .from("redemptions")
    .select("*", { count: "exact", head: true })
    .eq("family_id", user.family_id!)
    .eq("status", "pending");

  const totalPending = (pendingStarsCount || 0) + (pendingRedemptionsCount || 0);

  // Fetch family children using admin client to bypass RLS
  const { data: children } = await adminClient
    .from("users")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("role", "child");

  // Fetch family parents count
  const { count: parentsCount } = await adminClient
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("family_id", user.family_id!)
    .eq("role", "parent");

  const childrenCount = children?.length || 0;
  const totalFamilyMembers = (parentsCount || 0) + childrenCount;

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
          👋 Welcome, {user.name}!
        </h1>
        <p className="text-gray-600">
          Manage your family's quest progress and rewards
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Approvals */}
        <Link href={`/${locale}/admin/approve`}>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">
                {t("admin.pendingApprovals")}
              </h3>
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-4xl font-bold text-warning">{totalPending}</p>
            <p className="text-sm text-gray-500 mt-1">
              {pendingStarsCount || 0} stars, {pendingRedemptionsCount || 0} redemptions
            </p>
          </div>
        </Link>

        {/* Family Members */}
        <Link href={`/${locale}/admin/family`}>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">
                {locale === "zh-CN" ? "家庭成员" : "Family Members"}
              </h3>
              <span className="text-3xl">👥</span>
            </div>
            <p className="text-4xl font-bold text-secondary">{totalFamilyMembers}</p>
            <p className="text-sm text-gray-500 mt-1">
              {parentsCount || 0} {locale === "zh-CN" ? "家长" : (parentsCount === 1 ? "parent" : "parents")}, {childrenCount} {locale === "zh-CN" ? "孩子" : (childrenCount === 1 ? "child" : "children")}
            </p>
          </div>
        </Link>

        {/* Quick Record */}
        <Link href={`/${locale}/admin/record`}>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">
                Quick Record
              </h3>
              <span className="text-3xl">⚡</span>
            </div>
            <p className="text-xl font-semibold text-primary mt-4">
              {t("admin.recordStars")}
            </p>
            <p className="text-sm text-gray-500 mt-1">Click to add stars</p>
          </div>
        </Link>

        {/* Credit Management */}
        <Link href={`/${locale}/admin/credit`}>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">
                Credit Management
              </h3>
              <span className="text-3xl">💳</span>
            </div>
            <p className="text-xl font-semibold text-purple-600 mt-4">
              {locale === "zh-CN" ? "信用管理" : "Manage Credit"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {locale === "zh-CN" ? "设置额度和利率" : "Set limits & rates"}
            </p>
          </div>
        </Link>

        {/* Invite Parent */}
        <InviteParentCard familyId={user.family_id!} locale={locale} />
      </div>

      {/* Children Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
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
                      <p className="text-sm text-gray-600">
                        Level {(balance as any)?.lifetime_stars || 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Current Stars</p>
                      <p className="text-2xl font-bold text-primary">
                        {(balance as any)?.current_stars || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Lifetime</p>
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
            <p className="text-gray-500 mb-4">No children added yet</p>
            <Link
              href={`/${locale}/admin/family`}
              className="inline-block bg-secondary text-white px-6 py-2 rounded-lg hover:bg-secondary/90"
            >
              Add Child
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
