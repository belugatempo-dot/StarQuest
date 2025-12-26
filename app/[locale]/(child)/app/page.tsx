import { useTranslations } from "next-intl";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ChildDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const t = useTranslations();
  const supabase = await createClient();

  // Fetch child balance
  const { data: balance } = await supabase
    .from("child_balances")
    .select("*")
    .eq("child_id", user.id)
    .maybeSingle();

  // Fetch recent transactions
  const { data: recentTransactions } = await supabase
    .from("star_transactions")
    .select("*, quests(name_en, name_zh, icon)")
    .eq("child_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(5);

  const currentStars = (balance as any)?.current_stars || 0;
  const lifetimeStars = (balance as any)?.lifetime_stars || 0;

  // Calculate current level
  const { data: levels } = await supabase
    .from("levels")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("stars_required", { ascending: true });

  let currentLevel = levels?.[0];
  if (levels) {
    for (const level of levels) {
      if (lifetimeStars >= (level as any).stars_required) {
        currentLevel = level;
      } else {
        break;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">
          👋 {t("dashboard.title")}, {user.name}!
        </h1>
        <p className="text-gray-600">
          Keep up the great work! You're doing amazing.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Current Balance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">
              {t("dashboard.currentBalance")}
            </h3>
            <span className="text-3xl">⭐</span>
          </div>
          <p className="text-4xl font-bold text-primary">{currentStars}</p>
          <p className="text-sm text-gray-500 mt-1">{t("common.stars")}</p>
        </div>

        {/* Lifetime Stars */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">
              {t("dashboard.lifetimeStars")}
            </h3>
            <span className="text-3xl">✨</span>
          </div>
          <p className="text-4xl font-bold text-success">{lifetimeStars}</p>
          <p className="text-sm text-gray-500 mt-1">Total earned</p>
        </div>

        {/* Current Level */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">
              {t("dashboard.currentLevel")}
            </h3>
            <span className="text-3xl">{(currentLevel as any)?.icon}</span>
          </div>
          <p className="text-2xl font-bold text-secondary">
            {locale === "zh-CN"
              ? (currentLevel as any)?.name_zh || (currentLevel as any)?.name_en
              : (currentLevel as any)?.name_en}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Level {(currentLevel as any)?.level_number}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">{t("dashboard.recentActivity")}</h2>
        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction: any) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {transaction.quests?.icon || "⭐"}
                  </span>
                  <div>
                    <p className="font-semibold">
                      {locale === "zh-CN"
                        ? transaction.quests?.name_zh || transaction.quests?.name_en || transaction.custom_description
                        : transaction.quests?.name_en || transaction.custom_description}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString(
                        locale === "zh-CN" ? "zh-CN" : "en-US"
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xl font-bold ${
                    transaction.stars > 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {transaction.stars > 0 ? "+" : ""}
                  {transaction.stars}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No recent activity yet. Start completing quests!
          </p>
        )}
      </div>
    </div>
  );
}
