import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const supabase = await createClient();

  // Fetch child balance
  const { data: balance } = await supabase
    .from("child_balances")
    .select("*")
    .eq("child_id", user.id)
    .maybeSingle();

  const currentStars = (balance as any)?.current_stars || 0;
  const lifetimeStars = (balance as any)?.lifetime_stars || 0;

  // Fetch all levels
  const { data: levels } = await supabase
    .from("levels")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("stars_required", { ascending: true });

  // Calculate current level and next level
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

  // Fetch statistics
  const { count: totalTransactions } = await supabase
    .from("star_transactions")
    .select("*", { count: "exact", head: true })
    .eq("child_id", user.id)
    .eq("status", "approved");

  const { count: totalRedemptions } = await supabase
    .from("redemptions")
    .select("*", { count: "exact", head: true })
    .eq("child_id", user.id)
    .eq("status", "approved");

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-8">
        <div className="flex items-center space-x-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-5xl">
            {user.avatar_url || "👤"}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{(currentLevel as any)?.icon}</span>
                <span className="text-lg font-semibold">
                  {locale === "zh-CN"
                    ? (currentLevel as any)?.name_zh || (currentLevel as any)?.name_en
                    : (currentLevel as any)?.name_en}
                </span>
              </div>
              <div className="px-3 py-1 bg-primary rounded-full text-sm font-semibold">
                Level {(currentLevel as any)?.level_number}
              </div>
            </div>
          </div>

          {/* Current Stars */}
          <div className="text-right">
            <div className="text-sm text-slate-400 mb-1">Current Stars</div>
            <div className="text-4xl font-bold text-primary">{currentStars}</div>
          </div>
        </div>
      </div>

      {/* Level Progress */}
      {nextLevel && (
        <div className="dark-card rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Next Level</h2>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{(nextLevel as any).icon}</span>
              <span className="font-semibold">
                {locale === "zh-CN"
                  ? (nextLevel as any).name_zh || (nextLevel as any).name_en
                  : (nextLevel as any).name_en}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-8 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success to-primary transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((lifetimeStars - ((currentLevel as any)?.stars_required || 0)) /
                      ((nextLevel as any).stars_required -
                        ((currentLevel as any)?.stars_required || 0))) *
                      100
                  )}%`,
                }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
              {lifetimeStars} / {(nextLevel as any).stars_required} stars
            </div>
          </div>

          <p className="text-sm text-slate-400 mt-2 text-center">
            {(nextLevel as any).stars_required - lifetimeStars} more stars to go!
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="dark-card rounded-lg shadow-md p-6">
          <div className="text-3xl mb-2">✨</div>
          <div className="text-2xl font-bold text-success">{lifetimeStars}</div>
          <div className="text-sm text-slate-400">{t("dashboard.lifetimeStars")}</div>
        </div>

        <div className="dark-card rounded-lg shadow-md p-6">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-2xl font-bold text-secondary">
            {totalTransactions || 0}
          </div>
          <div className="text-sm text-slate-400">Quests Completed</div>
        </div>

        <div className="dark-card rounded-lg shadow-md p-6">
          <div className="text-3xl mb-2">🎁</div>
          <div className="text-2xl font-bold text-primary">
            {totalRedemptions || 0}
          </div>
          <div className="text-sm text-slate-400">Rewards Claimed</div>
        </div>
      </div>

      {/* Badge Wall */}
      <div className="dark-card rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Achievement Badges</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {levels?.map((level: any) => {
            const achieved = lifetimeStars >= level.stars_required;
            return (
              <div
                key={level.id}
                className={`text-center p-4 rounded-lg border-2 transition ${
                  achieved
                    ? "bg-primary/10 border-primary shadow-md"
                    : "bg-white/5 border-white/10 opacity-50 grayscale"
                }`}
              >
                <div className="text-4xl mb-2">{level.icon}</div>
                <div className="text-xs font-semibold">
                  {locale === "zh-CN"
                    ? level.name_zh || level.name_en
                    : level.name_en}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Lv.{level.level_number}
                </div>
                {achieved ? (
                  <div className="text-xs text-success mt-1 font-semibold">✓ Unlocked</div>
                ) : (
                  <div className="text-xs text-slate-500 mt-1">
                    {level.stars_required} ⭐
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Info */}
      <div className="dark-card rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-slate-400">Name</span>
            <span className="font-semibold">{user.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-slate-400">Language</span>
            <span className="font-semibold">
              {locale === "en" ? "English" : "简体中文"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-slate-400">Member Since</span>
            <span className="font-semibold">
              {new Date(user.created_at).toLocaleDateString(
                locale === "zh-CN" ? "zh-CN" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
