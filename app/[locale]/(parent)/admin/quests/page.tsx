import { useTranslations } from "next-intl";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import QuestManagement from "@/components/admin/QuestManagement";

export default async function QuestManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();

  // Fetch all quests for this family
  const { data: quests } = await supabase
    .from("quests")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("category", { ascending: true })
    .order("is_positive", { ascending: false })
    .order("created_at", { ascending: false });

  const t = useTranslations();

  // Count positive and negative quests
  const positiveQuests = quests?.filter((q) => q.is_positive) || [];
  const negativeQuests = quests?.filter((q) => !q.is_positive) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/20 to-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {t("admin.questManagement")}
            </h1>
            <p className="text-gray-700">
              Manage tasks and activities for your children
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Positive Tasks</div>
                <div className="text-3xl font-bold text-success">
                  {positiveQuests.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Negative Tasks</div>
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
      />
    </div>
  );
}
