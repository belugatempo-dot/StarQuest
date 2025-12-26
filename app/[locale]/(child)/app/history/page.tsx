import { useTranslations } from "next-intl";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import TransactionList from "@/components/child/TransactionList";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const supabase = await createClient();

  // Fetch all transactions for the child
  const { data: transactions, error } = await supabase
    .from("star_transactions")
    .select(`
      *,
      quests (
        name_en,
        name_zh,
        icon,
        category
      )
    `)
    .eq("child_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
  }

  const t = useTranslations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-2">{t("history.title")}</h1>
        <p className="text-gray-600">
          Track all your star earnings and deductions
        </p>
      </div>

      {/* Transaction List */}
      <TransactionList
        transactions={transactions || []}
        locale={locale}
      />
    </div>
  );
}
