"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Database } from "@/types/database";
import RewardGrid from "@/components/child/RewardGrid";

type User = Database["public"]["Tables"]["users"]["Row"];
type Reward = Database["public"]["Tables"]["rewards"]["Row"];

interface ChildBalance {
  child_id: string;
  current_stars: number;
  spendable_stars: number;
}

interface ParentRedeemSectionProps {
  familyChildren: User[];
  rewards: Reward[];
  childBalances: ChildBalance[];
  locale: string;
  familyId: string;
  parentId: string;
}

export default function ParentRedeemSection({
  familyChildren: children,
  rewards,
  childBalances,
  locale,
  familyId,
  parentId,
}: ParentRedeemSectionProps) {
  const t = useTranslations();
  const [selectedChild, setSelectedChild] = useState<string>("");

  // Auto-select child if there's only one
  useEffect(() => {
    if (children.length === 1 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Get selected child's balance
  const selectedChildBalance = childBalances.find(
    (b) => b.child_id === selectedChild
  );
  const currentStars = selectedChildBalance?.current_stars || 0;
  const spendableStars = selectedChildBalance?.spendable_stars || 0;

  // Filter only active rewards
  const activeRewards = rewards.filter((r) => r.is_active);

  // No children case
  if (children.length === 0) {
    return (
      <div className="dark-card rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🎁</span>
          {t("admin.quickRedeem")}
        </h2>
        <div className="p-4 bg-yellow-500/15 border border-yellow-500/30 rounded text-yellow-300 text-sm">
          {t("admin.noChildrenInFamily")}
        </div>
      </div>
    );
  }

  return (
    <div className="dark-card rounded-lg shadow-md p-6 space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <span>🎁</span>
          {t("admin.quickRedeem")}
        </h2>
        <p className="text-slate-400 text-sm">
          {locale === "zh-CN"
            ? "直接为孩子兑换奖励，无需审批"
            : "Redeem rewards for your child directly, no approval needed"}
        </p>
      </div>

      {/* Child Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("admin.selectChild")} {children.length > 1 ? "*" : ""}
        </label>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {children.map((child) => {
            const balance = childBalances.find((b) => b.child_id === child.id);
            return (
              <div
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedChild === child.id
                    ? "border-secondary bg-secondary/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-xl">
                      {child.avatar_url || "👤"}
                    </div>
                    <div>
                      <div className="font-semibold">{child.name}</div>
                      <div className="text-xs text-slate-400">
                        {balance?.current_stars || 0} ⭐
                      </div>
                    </div>
                  </div>
                  {selectedChild === child.id && (
                    <span className="text-secondary text-xl">✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Child Balance Info */}
      {selectedChild && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">
              {locale === "zh-CN" ? "可用星星：" : "Available Stars:"}
            </span>
            <span className="text-2xl font-bold text-primary">
              {spendableStars} ⭐
            </span>
          </div>
        </div>
      )}

      {/* Reward Grid */}
      {selectedChild ? (
        activeRewards.length > 0 ? (
          <RewardGrid
            rewards={activeRewards}
            currentStars={currentStars}
            spendableStars={spendableStars}
            locale={locale}
            userId={parentId}
            isParent={true}
            childId={selectedChild}
            familyId={familyId}
          />
        ) : (
          <div className="p-8 text-center bg-white/5 rounded-lg">
            <div className="text-4xl mb-2">🎁</div>
            <p className="text-slate-400">{t("common.noData")}</p>
          </div>
        )
      ) : (
        <div className="p-8 text-center bg-white/5 rounded-lg border-2 border-dashed border-white/20">
          <div className="text-4xl mb-2">👆</div>
          <p className="text-slate-400">
            {locale === "zh-CN"
              ? "请先选择一个孩子"
              : "Please select a child first"}
          </p>
        </div>
      )}
    </div>
  );
}
