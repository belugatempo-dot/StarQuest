"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate } from "@/lib/supabase/helpers";
import { getRewardName } from "@/lib/localization";
import type { Database } from "@/types/database";
import RewardFormModal from "./RewardFormModal";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];

interface RewardManagementProps {
  rewards: Reward[];
  locale: string;
  familyId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  screen_time: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  toys: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  activities: "bg-green-500/15 text-green-300 border-green-500/30",
  treats: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  other: "bg-white/10 text-slate-300 border-white/20",
};

export default function RewardManagement({
  rewards,
  locale,
  familyId,
}: RewardManagementProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>("all");

  // Get unique categories
  const categories = ["all", ...new Set(rewards.map((r) => r.category).filter(Boolean))];

  // Filter rewards
  const filteredRewards =
    filterCategory === "all"
      ? rewards
      : rewards.filter((r) => r.category === filterCategory);

  const handleToggleActive = async (reward: Reward) => {
    try {
      const { error } = await typedUpdate(supabase, "rewards", { is_active: !reward.is_active })
        .eq("id", reward.id);

      if (error) throw error;

      router.refresh();
    } catch (err: any) {
      console.error("Error toggling reward:", err);
      alert(
        locale === "zh-CN"
          ? "切换奖励状态失败"
          : "Failed to toggle reward status"
      );
    }
  };

  const handleDelete = async (reward: Reward) => {
    const rewardName =
      locale === "zh-CN" ? reward.name_zh || reward.name_en : reward.name_en;

    const confirmMessage =
      locale === "zh-CN"
        ? `确定要删除奖励 "${rewardName}" 吗？`
        : `Are you sure you want to delete "${rewardName}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const { error } = await supabase.from("rewards").delete().eq("id", reward.id);

      if (error) throw error;

      router.refresh();
    } catch (err: any) {
      console.error("Error deleting reward:", err);
      alert(locale === "zh-CN" ? "删除奖励失败" : "Failed to delete reward");
    }
  };

  const getCategoryColor = (category: string | null) => {
    return CATEGORY_COLORS[category || "other"] || CATEGORY_COLORS.other;
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-slate-400">
            {locale === "zh-CN"
              ? `共 ${rewards.length} 个奖励`
              : `${rewards.length} rewards`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition font-semibold"
        >
          <span>➕</span>
          <span>
            {locale === "zh-CN" ? "添加奖励" : "Add Reward"}
          </span>
        </button>
      </div>

      {/* Category Filter */}
      {rewards.length > 0 && (
        <div className="dark-card rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterCategory === cat
                    ? "bg-primary text-white"
                    : "bg-white/10 text-slate-400 hover:bg-white/15"
                }`}
              >
                {cat === "all"
                  ? t("common.all")
                  : t(`rewards.category.${cat}` as any)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rewards List */}
      {filteredRewards.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map((reward) => {
            const rewardName = getRewardName(reward, locale);

            return (
              <div
                key={reward.id}
                className={`dark-card rounded-lg shadow-md overflow-hidden border-2 ${
                  reward.is_active
                    ? "border-white/10"
                    : "border-white/20 opacity-60"
                }`}
              >
                <div className="p-5">
                  {/* Reward Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{reward.icon || "🎁"}</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {reward.stars_cost}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t("common.stars")}
                      </div>
                    </div>
                  </div>

                  {/* Reward Name */}
                  <h4 className="font-semibold text-lg mb-2">{rewardName}</h4>

                  {/* Description */}
                  {reward.description && (
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                      {reward.description}
                    </p>
                  )}

                  {/* Category & Status */}
                  <div className="flex items-center gap-2 mb-4">
                    {reward.category && (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(
                          reward.category
                        )}`}
                      >
                        {t(`rewards.category.${reward.category}` as any)}
                      </span>
                    )}
                    {!reward.is_active && (
                      <span className="inline-block px-3 py-1 bg-red-500/15 text-red-300 rounded-full text-xs font-semibold">
                        {locale === "zh-CN" ? "已停用" : "Inactive"}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingReward(reward)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-500/15 text-blue-300 rounded hover:bg-blue-500/25 transition font-medium"
                    >
                      ✏️ {locale === "zh-CN" ? "编辑" : "Edit"}
                    </button>
                    <button
                      onClick={() => handleToggleActive(reward)}
                      className={`flex-1 px-3 py-2 text-sm rounded transition font-medium ${
                        reward.is_active
                          ? "bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25"
                          : "bg-green-500/15 text-green-300 hover:bg-green-500/25"
                      }`}
                    >
                      {reward.is_active
                        ? locale === "zh-CN"
                          ? "停用"
                          : "Disable"
                        : locale === "zh-CN"
                        ? "启用"
                        : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(reward)}
                      className="px-3 py-2 text-sm bg-red-500/15 text-red-300 rounded hover:bg-red-500/25 transition font-medium"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : rewards.length === 0 ? (
        <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🎁</div>
          <p className="text-slate-400 mb-4 text-lg">
            {locale === "zh-CN" ? "还没有奖励" : "No rewards yet"}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition"
          >
            <span>➕</span>
            <span>
              {locale === "zh-CN" ? "添加第一个奖励" : "Add First Reward"}
            </span>
          </button>
        </div>
      ) : (
        <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-slate-400 text-lg">
            {locale === "zh-CN"
              ? "此类别下没有奖励"
              : "No rewards in this category"}
          </p>
        </div>
      )}

      {/* Add/Edit Modals */}
      {showAddModal && (
        <RewardFormModal
          familyId={familyId}
          locale={locale}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}

      {editingReward && (
        <RewardFormModal
          reward={editingReward}
          familyId={familyId}
          locale={locale}
          onClose={() => setEditingReward(null)}
          onSuccess={() => {
            setEditingReward(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
