import { useTranslations } from "next-intl";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LevelManagement from "@/components/admin/LevelManagement";

export default async function LevelConfigurationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();

  // Fetch all levels for this family, ordered by level number
  const { data: levels } = await supabase
    .from("levels")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("level_number", { ascending: true });

  const t = useTranslations();

  // Calculate statistics
  const totalLevels = levels?.length || 0;
  const maxStars = levels && levels.length > 0 ? (levels[levels.length - 1] as any).stars_required || 0 : 0;
  const avgStarsPerLevel =
    totalLevels > 1 ? Math.round(maxStars / (totalLevels - 1)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/20 to-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {locale === "zh-CN" ? "等级配置" : "Level Configuration"}
            </h1>
            <p className="text-gray-700">
              {locale === "zh-CN"
                ? "管理孩子的成长等级和星星要求"
                : "Manage growth levels and star requirements for children"}
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  {locale === "zh-CN" ? "总等级数" : "Total Levels"}
                </div>
                <div className="text-3xl font-bold text-primary">
                  {totalLevels}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  {locale === "zh-CN" ? "最高要求" : "Max Stars"}
                </div>
                <div className="text-3xl font-bold text-secondary">
                  {maxStars.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  {locale === "zh-CN" ? "平均间隔" : "Avg Gap"}
                </div>
                <div className="text-3xl font-bold text-success">
                  {avgStarsPerLevel.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Management Component */}
      <LevelManagement levels={levels || []} locale={locale} />
    </div>
  );
}
