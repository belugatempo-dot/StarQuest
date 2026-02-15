"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { typedInsert } from "@/lib/supabase/helpers";
import ModalFrame from "@/components/ui/ModalFrame";
import { getRewardName } from "@/lib/localization";
import type { Database } from "@/types/database";
import CreditUsageWarning from "./CreditUsageWarning";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];

interface RedeemRewardModalProps {
  reward: Reward;
  currentStars: number;
  locale: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  // Credit-related props
  creditEnabled?: boolean;
  creditLimit?: number;
  creditUsed?: number;
  availableCredit?: number;
  spendableStars?: number;
  // Parent redemption props
  isParent?: boolean;
  childId?: string;
  familyId?: string;
}

export default function RedeemRewardModal({
  reward,
  currentStars,
  locale,
  userId,
  onClose,
  onSuccess,
  creditEnabled = false,
  creditLimit = 0,
  creditUsed = 0,
  availableCredit = 0,
  spendableStars,
  isParent = false,
  childId,
  familyId,
}: RedeemRewardModalProps) {
  const t = useTranslations();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCredit, setConfirmCredit] = useState(false);

  const supabase = createClient();

  // Calculate actual spendable amount
  const actualSpendable = spendableStars ?? (creditEnabled ? Math.max(currentStars, 0) + availableCredit : Math.max(currentStars, 0));

  // Calculate how much credit will be used
  const willUseCredit = creditEnabled && reward.stars_cost > currentStars;
  const creditToUse = willUseCredit ? Math.min(reward.stars_cost - Math.max(currentStars, 0), availableCredit) : 0;
  const newTotalDebt = creditUsed + creditToUse;

  // Check if can afford
  const canAfford = actualSpendable >= reward.stars_cost;

  // Remaining after redemption
  const remainingStars = currentStars - reward.stars_cost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If using credit and hasn't confirmed, show warning (only for child mode)
    if (!isParent && willUseCredit && creditToUse > 0 && !confirmCredit) {
      setConfirmCredit(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get family_id - use provided familyId for parent mode, or fetch from user
      let resolvedFamilyId = familyId;
      if (!resolvedFamilyId) {
        const { data: userData } = await supabase
          .from("users")
          .select("family_id")
          .eq("id", userId)
          .maybeSingle();

        if (!(userData as any)?.family_id) {
          throw new Error("Family not found");
        }
        resolvedFamilyId = (userData as any).family_id;
      }

      // Determine child_id: use childId for parent mode, userId for child mode
      const targetChildId = isParent ? childId : userId;

      // Create redemption request with credit info
      // Parent redemptions are auto-approved with no credit
      const { data: redemption, error: insertError } = await typedInsert(supabase, "redemptions", {
          family_id: resolvedFamilyId!,
          child_id: targetChildId!,
          reward_id: reward.id,
          stars_spent: reward.stars_cost,
          status: isParent ? "approved" : "pending",
          child_note: note.trim() || null,
          uses_credit: isParent ? false : (willUseCredit && creditToUse > 0),
          credit_amount: isParent ? 0 : creditToUse,
          reviewed_at: isParent ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // If using credit, record the credit transaction (only for child mode)
      if (!isParent && willUseCredit && creditToUse > 0 && redemption?.id) {
        await (supabase.rpc as any)("record_credit_usage", {
          p_child_id: userId,
          p_redemption_id: redemption.id,
          p_credit_amount: creditToUse,
        });
      }

      // Success!
      onSuccess();
    } catch (err) {
      console.error("Error creating redemption:", err);
      setError(err instanceof Error ? err.message : "Failed to create redemption");
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      title={isParent ? t("admin.redeemForChild") : t("rewards.requestRedemption")}
      onClose={onClose}
    >
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Reward Info */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{reward.icon || "🎁"}</div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {getRewardName(reward, locale)}
                  </h3>
                  {reward.category && (
                    <p className="text-sm text-slate-400">
                      {t(`rewards.category.${reward.category}` as any)}
                    </p>
                  )}
                  {reward.description && (
                    <p className="text-sm text-slate-300 mt-1">
                      {reward.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <div className="text-2xl font-bold text-primary">
                  {reward.stars_cost}
                </div>
                <div className="text-xs text-slate-400">
                  {t("common.stars")}
                </div>
              </div>
            </div>
          </div>

          {/* Balance Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-300">
                {t("credit.currentBalance")}:
              </span>
              <span className={`text-lg font-bold ${currentStars < 0 ? "text-danger" : "text-blue-200"}`}>
                {currentStars} ⭐
              </span>
            </div>

            {/* Credit Info - only show for child mode */}
            {!isParent && creditEnabled && availableCredit > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-300">
                  {t("credit.availableCredit")}:
                </span>
                <span className="text-lg font-bold text-secondary">
                  +{availableCredit} ⭐
                </span>
              </div>
            )}

            {!isParent && creditEnabled && (
              <>
                <div className="border-t border-blue-500/30 my-2"></div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-blue-300">
                    {t("credit.canSpend")}:
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {actualSpendable} ⭐
                  </span>
                </div>
              </>
            )}

            <div className="border-t border-blue-500/30 my-2"></div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-300">
                {t("rewards.cost")}:
              </span>
              <span className="text-lg font-bold text-danger">
                -{reward.stars_cost} ⭐
              </span>
            </div>
            <div className="border-t border-blue-500/30 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-blue-300">
                {t("credit.afterRedemption")}:
              </span>
              <span
                className={`text-xl font-bold ${
                  remainingStars >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {remainingStars} ⭐
              </span>
            </div>
          </div>

          {/* Credit Usage Warning - only show for child mode */}
          {!isParent && willUseCredit && creditToUse > 0 && (
            <CreditUsageWarning
              creditAmount={creditToUse}
              currentDebt={creditUsed}
              newTotalDebt={newTotalDebt}
              creditLimit={creditLimit}
              locale={locale}
            />
          )}

          {/* Cannot Afford Warning */}
          {!canAfford && (
            <div className="bg-danger/10 border border-danger rounded-lg p-4">
              <p className="text-sm text-danger font-medium">
                ❌ {t("credit.cannotAfford")}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t("credit.needMoreStars", { needed: reward.stars_cost - actualSpendable })}
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              {t("quests.note")} ({t("common.optional")})
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
              placeholder={locale === "zh-CN" ? "你想什么时候获得这个奖励？" : "When would you like this reward?"}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Info Box */}
          {isParent ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-green-300">
                <span className="font-semibold">✓ {t("credit.note")}:</span>{" "}
                {t("admin.autoApproveInfo")}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-sm text-yellow-300">
                <span className="font-semibold">⏳ {t("credit.note")}:</span>{" "}
                {t("credit.redemptionPendingInfo")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-slate-300 hover:bg-white/5 transition"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !canAfford}
              className={`flex-1 px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold ${
                !isParent && willUseCredit && creditToUse > 0 && !confirmCredit
                  ? "bg-warning text-gray-900 hover:bg-warning/90"
                  : isParent
                  ? "bg-success text-white hover:bg-success/90"
                  : "bg-primary text-gray-900 hover:bg-primary/90"
              }`}
            >
              {loading
                ? t("common.loading")
                : isParent
                ? t("admin.redeemNow")
                : !isParent && willUseCredit && creditToUse > 0 && !confirmCredit
                ? t("credit.confirmBorrow")
                : t("common.submit")}
            </button>
          </div>
        </form>
    </ModalFrame>
  );
}
