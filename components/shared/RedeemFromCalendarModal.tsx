"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import ModalFrame from "@/components/ui/ModalFrame";
import RewardGrid from "@/components/child/RewardGrid";
import type { Database } from "@/types/database";
import type { ChildBalance } from "@/types/activity";

type User = Database["public"]["Tables"]["users"]["Row"];
type Reward = Database["public"]["Tables"]["rewards"]["Row"];

interface RedeemFromCalendarModalProps {
  locale: string;
  rewards: Reward[];
  familyChildren: User[];
  childBalances: ChildBalance[];
  currentUserId: string;
  familyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RedeemFromCalendarModal({
  locale,
  rewards,
  familyChildren,
  childBalances,
  currentUserId,
  familyId,
  onClose,
  onSuccess,
}: RedeemFromCalendarModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const [selectedChild, setSelectedChild] = useState<string>("");

  // Auto-select child if there's only one
  useEffect(() => {
    if (familyChildren.length === 1 && !selectedChild) {
      setSelectedChild(familyChildren[0].id);
    }
  }, [familyChildren, selectedChild]);

  // Get selected child's balance
  const selectedChildBalance = childBalances.find(
    (b) => b.child_id === selectedChild
  );
  const currentStars = selectedChildBalance?.current_stars || 0;
  const spendableStars = selectedChildBalance?.spendable_stars || 0;

  // Filter only active rewards
  const activeRewards = rewards.filter((r) => r.is_active);

  return (
    <ModalFrame
      title={t("activity.redeemReward")}
      onClose={onClose}
      maxWidth="lg"
      stickyHeader
    >
      <div className="px-6 pb-6 space-y-4">
        {/* Child Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("activity.selectChild")}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {familyChildren.map((child) => {
              const balance = childBalances.find(
                (b) => b.child_id === child.id
              );
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChild(child.id)}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition text-left ${
                    selectedChild === child.id
                      ? "border-secondary bg-secondary/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  data-testid={`child-selector-${child.id}`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm">
                      {child.avatar_url || "👤"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{child.name}</div>
                      <div className="text-xs text-slate-400">
                        {balance?.current_stars || 0} ⭐
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Child Balance */}
        {selectedChild && (
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">
                {t("activity.availableStars")}:
              </span>
              <span className="text-xl font-bold text-primary">
                {spendableStars} ⭐
              </span>
            </div>
          </div>
        )}

        {/* Reward Grid or Prompt */}
        {selectedChild ? (
          activeRewards.length > 0 ? (
            <RewardGrid
              rewards={activeRewards}
              currentStars={currentStars}
              spendableStars={spendableStars}
              locale={locale}
              userId={currentUserId}
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
              {t("activity.selectChildToRedeem")}
            </p>
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
