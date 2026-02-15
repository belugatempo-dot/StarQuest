import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ locale: string; childId: string }>;
}) {
  const { locale, childId } = await params;
  const user = await requireParent(locale);
  const adminClient = createAdminClient();
  const t = await getTranslations();

  // Fetch child information
  const { data: child, error: childError } = await adminClient
    .from("users")
    .select("*")
    .eq("id", childId)
    .eq("family_id", user.family_id!)
    .eq("role", "child")
    .maybeSingle();

  if (childError) {
    console.error("Error fetching child:", childError);
    notFound();
  }

  if (!child) {
    notFound();
  }

  // Fetch child's balance
  const { data: balance } = await adminClient
    .from("child_balances")
    .select("*")
    .eq("child_id", childId)
    .maybeSingle();

  const currentStars = (balance as any)?.current_stars || 0;
  const lifetimeStars = (balance as any)?.lifetime_stars || 0;

  // Fetch star transactions (last 20)
  const { data: transactions } = await adminClient
    .from("star_transactions")
    .select(`
      *,
      quest:quests(name_en, name_zh)
    `)
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch redemptions (last 10)
  const { data: redemptions } = await adminClient
    .from("redemptions")
    .select(`
      *,
      reward:rewards(name_en, name_zh, stars_cost)
    `)
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch levels to determine current level
  const { data: levels } = await adminClient
    .from("levels")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("stars_required", { ascending: true });

  // Determine current level
  let currentLevel = levels?.[0];
  let nextLevel = null;
  if (levels) {
    for (let i = 0; i < levels.length; i++) {
      if (lifetimeStars >= (levels[i] as any).stars_required) {
        currentLevel = levels[i];
        nextLevel = levels[i + 1] || null;
      } else {
        break;
      }
    }
  }

  const currentLevelName = locale === "zh-CN"
    ? (currentLevel as any)?.name_zh || (currentLevel as any)?.name_en
    : (currentLevel as any)?.name_en;

  const nextLevelName = nextLevel
    ? (locale === "zh-CN" ? (nextLevel as any)?.name_zh || (nextLevel as any)?.name_en : (nextLevel as any)?.name_en)
    : null;

  const starsToNextLevel = nextLevel
    ? (nextLevel as any).stars_required - lifetimeStars
    : 0;

  const progressPercent = nextLevel
    ? ((lifetimeStars - (currentLevel as any).stars_required) /
       ((nextLevel as any).stars_required - (currentLevel as any).stars_required)) * 100
    : 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Link
        href={`/${locale}/admin/dashboard`}
        className="inline-flex items-center text-secondary hover:underline mb-6"
      >
        ← Back to Dashboard
      </Link>

      {/* Header with Child Info */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-8 mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-5xl">
            {(child as any).avatar_url || "👤"}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {(child as any).name}
            </h1>
            <div className="flex items-center space-x-6 text-lg">
              <div>
                <span className="text-gray-600">Level:</span>{" "}
                <span className="font-semibold text-secondary">
                  {currentLevelName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Current Stars:</span>{" "}
                <span className="font-bold text-primary text-2xl">
                  ⭐ {currentStars}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Lifetime Stars:</span>{" "}
                <span className="font-semibold text-success">
                  🌟 {lifetimeStars}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Progress */}
      {nextLevel && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Level Progress</h2>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{currentLevelName}</span>
              <span>{nextLevelName}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-6 rounded-full transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              >
                {Math.round(progressPercent)}%
              </div>
            </div>
            <div className="text-center mt-2 text-sm text-gray-600">
              {starsToNextLevel} stars to next level
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          href={`/${locale}/admin/record?childId=${childId}`}
          className="bg-secondary text-white p-6 rounded-lg hover:bg-secondary/90 transition text-center"
        >
          <div className="text-4xl mb-2">⭐</div>
          <div className="text-xl font-semibold">Record Stars</div>
          <div className="text-sm opacity-90">Add stars for this child</div>
        </Link>
        <Link
          href={`/${locale}/admin/dashboard#approval-center`}
          className="bg-primary text-white p-6 rounded-lg hover:bg-primary/90 transition text-center"
        >
          <div className="text-4xl mb-2">✅</div>
          <div className="text-xl font-semibold">Approve Requests</div>
          <div className="text-sm opacity-90">Review pending requests</div>
        </Link>
      </div>

      {/* Star Transactions History */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Star Transaction History</h2>
        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Quest
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Stars
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {tx.quest
                        ? (locale === "zh-CN" ? tx.quest.name_zh || tx.quest.name_en : tx.quest.name_en)
                        : tx.custom_description || "Custom"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        tx.stars > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {tx.stars > 0 ? "+" : ""}
                      {tx.stars}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          tx.status === "approved"
                            ? "bg-success/20 text-success"
                            : tx.status === "pending"
                            ? "bg-warning/20 text-warning"
                            : "bg-danger/20 text-danger"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {tx.child_note || tx.parent_response || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        )}
      </div>

      {/* Redemption History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Redemption History</h2>
        {redemptions && redemptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Reward
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Stars Spent
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {redemptions.map((rd: any) => (
                  <tr key={rd.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(rd.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rd.reward
                        ? (locale === "zh-CN" ? rd.reward.name_zh || rd.reward.name_en : rd.reward.name_en)
                        : "Unknown Reward"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-danger">
                      -{rd.stars_spent}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          rd.status === "fulfilled"
                            ? "bg-success/20 text-success"
                            : rd.status === "approved"
                            ? "bg-primary/20 text-primary"
                            : rd.status === "pending"
                            ? "bg-warning/20 text-warning"
                            : "bg-danger/20 text-danger"
                        }`}
                      >
                        {rd.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No redemptions yet</p>
        )}
      </div>
    </div>
  );
}
