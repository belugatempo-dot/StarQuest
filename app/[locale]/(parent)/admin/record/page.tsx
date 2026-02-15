import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import QuickRecordForm from "@/components/admin/QuickRecordForm";

export default async function RecordStarsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Fetch all children in the family using admin client
  const { data: children } = await adminClient
    .from("users")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("role", "child")
    .order("name", { ascending: true });

  // Fetch all quests (both positive and negative)
  const { data: quests } = await supabase
    .from("quests")
    .select("*")
    .eq("family_id", user.family_id!)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/20 to-primary/20 rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">{t("admin.recordStars")}</h1>
        <p className="text-slate-300">
          Quickly record stars for completed quests or custom behaviors.
          Stars are added immediately without approval.
        </p>
      </div>

      {/* Quick Record Form */}
      <QuickRecordForm
        children={children || []}
        quests={quests || []}
        locale={locale}
        parentId={user.id}
        familyId={user.family_id!}
      />

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
        <h3 className="font-semibold text-blue-300 mb-2">💡 How it works</h3>
        <ul className="text-sm text-blue-300 space-y-1">
          <li>• <strong>Select a child</strong> from your family</li>
          <li>• <strong>Choose a quest template</strong> or enter a custom description</li>
          <li>• <strong>Stars are added immediately</strong> - no approval needed</li>
          <li>• Use positive quests (+stars) to reward good behavior</li>
          <li>• Use negative quests (-stars) for rule violations</li>
        </ul>
      </div>
    </div>
  );
}
