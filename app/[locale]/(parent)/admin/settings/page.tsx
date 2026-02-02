import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import ReportPreferencesForm from "@/components/admin/ReportPreferencesForm";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();
  const t = await getTranslations();

  // Fetch family info
  const { data: family } = await supabase
    .from("families")
    .select("id, name")
    .eq("id", user.family_id!)
    .single();

  // Fetch existing report preferences
  const { data: preferences } = await supabase
    .from("family_report_preferences")
    .select("*")
    .eq("family_id", user.family_id!)
    .maybeSingle();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t("settings.title")}
        </h1>
        <p className="text-gray-600">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Report Preferences Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t("settings.reportPreferences")}
        </h2>
        <p className="text-gray-600 mb-6">
          {t("settings.reportPreferencesDescription")}
        </p>

        <ReportPreferencesForm
          familyId={user.family_id!}
          preferences={preferences}
          parentEmail={user.email || ""}
          locale={locale}
        />
      </div>
    </div>
  );
}
