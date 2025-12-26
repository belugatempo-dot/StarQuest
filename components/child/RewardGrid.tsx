"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import RedeemRewardModal from "./RedeemRewardModal";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];

interface RewardGridProps {
  rewards: Reward[];
  currentStars: number;
  locale: string;
  userId: string;
}

export default function RewardGrid({
  rewards,
  currentStars,
  locale,
  userId,
}: RewardGridProps) {
  const t = useTranslations();
  const router = useRouter();
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>("all");

  // Get unique categories
  const categories = ["all", ...new Set(rewards.map((r) => r.category).filter(Boolean))];

  // Filter rewards
  const filteredRewards =
    filterCategory === "all"
      ? rewards
      : rewards.filter((r) => r.category === filterCategory);

  const getRewardName = (reward: Reward) => {
    return locale === "zh-CN"
      ? reward.name_zh || reward.name_en
      : reward.name_en;
  };

  const canAfford = (reward: Reward) => {
    return currentStars >= reward.stars_cost;
  };

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      screen_time: "bg-blue-100 text-blue-700 border-blue-300",
      toys: "bg-pink-100 text-pink-700 border-pink-300",
      activities: "bg-green-100 text-green-700 border-green-300",
      treats: "bg-orange-100 text-orange-700 border-orange-300",
      other: "bg-gray-100 text-gray-700 border-gray-300",
    };
    return colors[category || "other"] || colors.other;
  };

  return (
    <>
      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterCategory === cat
                  ? "bg-primary text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "all"
                ? t("common.all")
                : t(`rewards.category.${cat}` as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Reward Grid */}
      {filteredRewards.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">🎁</div>
          <p className="text-gray-500 text-lg">{t("common.noData")}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map((reward) => {
            const affordable = canAfford(reward);

            return (
              <div
                key={reward.id}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden group ${
                  affordable
                    ? "cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
                onClick={() => affordable && setSelectedReward(reward)}
              >
                {/* Reward Card */}
                <div className="p-6">
                  {/* Icon and Cost */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-4xl">{reward.icon || "🎁"}</div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${
                          affordable ? "text-primary" : "text-gray-400"
                        }`}
                      >
                        {reward.stars_cost}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t("common.stars")}
                      </div>
                    </div>
                  </div>

                  {/* Reward Name */}
                  <h3
                    className={`font-semibold text-lg mb-2 ${
                      affordable
                        ? "group-hover:text-primary transition"
                        : "text-gray-500"
                    }`}
                  >
                    {getRewardName(reward)}
                  </h3>

                  {/* Description */}
                  {reward.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {reward.description}
                    </p>
                  )}

                  {/* Category Badge */}
                  {reward.category && (
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(
                        reward.category
                      )}`}
                    >
                      {t(`rewards.category.${reward.category}` as any)}
                    </span>
                  )}

                  {/* Affordability Status */}
                  {!affordable && (
                    <div className="mt-4 p-2 bg-gray-100 rounded text-center">
                      <p className="text-xs text-gray-600">
                        Need {reward.stars_cost - currentStars} more stars
                      </p>
                    </div>
                  )}

                  {/* Action Hint */}
                  {affordable && (
                    <div className="mt-4 text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition">
                      Click to redeem →
                    </div>
                  )}
                </div>

                {/* Affordability Indicator */}
                {affordable && (
                  <div className="h-1 bg-gradient-to-r from-success to-primary"></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Redeem Reward Modal */}
      {selectedReward && (
        <RedeemRewardModal
          reward={selectedReward}
          currentStars={currentStars}
          locale={locale}
          userId={userId}
          onClose={() => setSelectedReward(null)}
          onSuccess={() => {
            setSelectedReward(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
