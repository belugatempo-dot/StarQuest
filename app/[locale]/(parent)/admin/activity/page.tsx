import { getTranslations } from "next-intl/server";
import { requireParent } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import ActivityList from "@/components/admin/ActivityList";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Fetch all transactions for the family with quest and child details
  const { data: transactions, error } = (await adminClient
    .from("star_transactions")
    .select(`
      *,
      quests (
        name_en,
        name_zh,
        icon,
        category
      ),
      children:users!star_transactions_child_id_fkey (
        name,
        avatar_url
      )
    `)
    .eq("family_id", user.family_id!)
    .order("created_at", { ascending: false })) as { data: any[] | null; error: any };

  if (error) {
    console.error("Error fetching transactions:", error);
  }

  const t = await getTranslations();

  // Calculate statistics - only count approved transactions for star totals
  const totalRecords = transactions?.length || 0;
  const approvedTransactions = transactions?.filter((t) => t.status === 'approved') || [];
  const positiveRecords = approvedTransactions.filter((t) => t.stars > 0).length;
  const negativeRecords = approvedTransactions.filter((t) => t.stars < 0).length;
  const totalStarsGiven = approvedTransactions.reduce((sum, t) => sum + (t.stars > 0 ? t.stars : 0), 0);
  const totalStarsDeducted = approvedTransactions.reduce((sum, t) => sum + (t.stars < 0 ? t.stars : 0), 0);
  const netStars = totalStarsGiven + totalStarsDeducted;

  return (
    <div className="space-y-6">
      {/* Header - Starry Night Theme */}
      <div className="night-header rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-white star-glow relative z-10">
          ✨ {locale === "zh-CN" ? "活动记录" : "Activity Log"}
        </h1>
        <p className="text-white/80 relative z-10">
          {locale === "zh-CN"
            ? "查看所有记录的星星活动，按日期和类型筛选"
            : "View all recorded star activities, filter by date and type"}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "总记录" : "Total Records"}
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalRecords}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "加分记录" : "Positive"}
          </div>
          <div className="text-2xl font-bold text-green-600">{positiveRecords}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "扣分记录" : "Negative"}
          </div>
          <div className="text-2xl font-bold text-red-600">{negativeRecords}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "总星星+" : "Total Stars +"}
          </div>
          <div className="text-2xl font-bold text-green-600">+{totalStarsGiven}</div>
        </div>
        <div className="glass-card rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">
            {locale === "zh-CN" ? "总星星-" : "Total Stars -"}
          </div>
          <div className="text-2xl font-bold text-red-600">{totalStarsDeducted}</div>
        </div>
        <div className="net-stars-card rounded-lg shadow-lg p-4">
          <div className="text-sm text-star-glow mb-1 relative z-10">
            ⭐ {locale === "zh-CN" ? "净值" : "Net Stars"}
          </div>
          <div className={`text-2xl font-bold relative z-10 star-glow ${netStars >= 0 ? "text-green-400" : "text-red-400"}`}>
            {netStars >= 0 ? `+${netStars}` : netStars}
          </div>
        </div>
      </div>

      {/* Activity List with Filters */}
      <ActivityList transactions={transactions || []} locale={locale} />
    </div>
  );
}
