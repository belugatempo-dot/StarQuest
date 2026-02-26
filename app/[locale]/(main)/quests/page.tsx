import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import QuestManagement from "@/components/admin/QuestManagement";
import CategoryManagement from "@/components/admin/CategoryManagement";
import QuestGrid from "@/components/child/QuestGrid";
import type { QuestCategoryRow } from "@/types/category";

export default async function QuestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);

  if (user.role === "parent") {
    return ParentQuests({ user, locale });
  }

  return ChildQuests({ user, locale });
}

// ---- Parent Quests ----

async function ParentQuests({
  user,
  locale,
}: {
  user: any;
  locale: string;
}) {
  const supabase = await createClient();
  const t = await getTranslations();

  const [questsResult, categoriesResult] = await Promise.all([
    supabase
      .from("quests")
      .select("*")
      .eq("family_id", user.family_id!)
      .order("category", { ascending: true })
      .order("stars", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("quest_categories")
      .select("*")
      .eq("family_id", user.family_id!)
      .order("sort_order", { ascending: true }),
  ]);

  const { data: quests } = questsResult;
  const { data: categoriesData, error: categoriesError } = categoriesResult;

  const categories = (categoriesError ? [] : categoriesData || []) as QuestCategoryRow[];
  const categoriesTableMissing = !!categoriesError;

  const positiveQuests = quests?.filter((q: any) => q.stars > 0) || [];
  const negativeQuests = quests?.filter((q: any) => q.stars < 0) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/20 to-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {t("admin.questManagement")}
            </h1>
            <p className="text-slate-300">
              {locale === "zh-CN"
                ? "管理孩子的任务和活动"
                : "Manage tasks and activities for your children"}
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">
                  {locale === "zh-CN" ? "正向任务" : "Positive Tasks"}
                </div>
                <div className="text-3xl font-bold text-success">
                  {positiveQuests.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">
                  {locale === "zh-CN" ? "负向任务" : "Negative Tasks"}
                </div>
                <div className="text-3xl font-bold text-danger">
                  {negativeQuests.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quest Management Component */}
      <QuestManagement
        quests={quests || []}
        locale={locale}
        familyId={user.family_id!}
        categories={categories}
      />

      {/* Category Management Component (below quests) */}
      {!categoriesTableMissing && (
        <CategoryManagement
          categories={categories}
          quests={quests || []}
          locale={locale}
          familyId={user.family_id!}
        />
      )}
    </div>
  );
}

// ---- Child Quests ----

async function ChildQuests({
  user,
  locale,
}: {
  user: any;
  locale: string;
}) {
  const supabase = await createClient();
  const t = await getTranslations();

  const { data: quests, error } = await supabase
    .from("quests")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("is_active", true)
    .eq("type", "bonus")
    .order("scope", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching quests:", error);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-4xl">⭐</span>
          <h1 className="text-3xl font-bold">{t("quests.title")}</h1>
        </div>
        <p className="text-slate-300">
          Complete these bonus quests to earn stars! Help your family, improve
          yourself, or help others - then request approval from your parents.
        </p>
        <div className="mt-3 text-sm text-slate-400 bg-blue-500/10 border border-blue-500/30 rounded p-3">
          💡 <strong>Tip:</strong> You can earn extra stars by going beyond your
          daily duties!
        </div>
      </div>

      {/* Quest Grid */}
      <QuestGrid quests={quests || []} locale={locale} userId={user.id} />
    </div>
  );
}
