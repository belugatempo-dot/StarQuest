import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import CreditManagementClient from "./CreditManagementClient";

export default async function CreditManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const t = await getTranslations();
  const adminClient = createAdminClient();

  // Fetch children with their balances
  const { data: children } = await adminClient
    .from("users")
    .select("id, name, family_id")
    .eq("family_id", user.family_id!)
    .eq("role", "child");

  // Fetch balances (includes credit info)
  const { data: balances } = await adminClient
    .from("child_balances")
    .select("*")
    .eq("family_id", user.family_id!);

  // Fetch existing credit settings
  const { data: creditSettings } = await adminClient
    .from("child_credit_settings")
    .select("*")
    .eq("family_id", user.family_id!);

  // Fetch family settlement day setting
  const { data: familySettings } = (await adminClient
    .from("families")
    .select("settlement_day")
    .eq("id", user.family_id!)
    .single()) as { data: { settlement_day: number } | null };

  const settlementDay = familySettings?.settlement_day || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">
          💳 {t("credit.pageTitle")}
        </h1>
        <p className="text-slate-400">
          {t("credit.pageDescription")}
        </p>
      </div>

      {/* Client Component with all the interactive parts */}
      <CreditManagementClient
        familyId={user.family_id!}
        familyChildren={children || []}
        balances={balances || []}
        creditSettings={creditSettings || []}
        settlementDay={settlementDay}
        locale={locale}
      />
    </div>
  );
}
