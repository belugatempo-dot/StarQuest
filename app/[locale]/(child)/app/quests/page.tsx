import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import QuestGrid from "@/components/child/QuestGrid";

export default async function QuestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const supabase = await createClient();

  // Fetch only BONUS quests for children (not duties or violations)
  // Children should not see duties (those are tracked by parents)
  // Children should not see violations (those are recorded by parents)
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

  const t = await getTranslations();

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
