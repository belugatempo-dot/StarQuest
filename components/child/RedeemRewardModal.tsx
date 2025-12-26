"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];

interface RedeemRewardModalProps {
  reward: Reward;
  currentStars: number;
  locale: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RedeemRewardModal({
  reward,
  currentStars,
  locale,
  userId,
  onClose,
  onSuccess,
}: RedeemRewardModalProps) {
  const t = useTranslations();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const getRewardName = (r: Reward) => {
    return locale === "zh-CN" ? r.name_zh || r.name_en : r.name_en;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get family_id from the current user
      const { data: userData } = await supabase
        .from("users")
        .select("family_id")
        .eq("id", userId)
        .single();

      if (!userData?.family_id) {
        throw new Error("Family not found");
      }

      // Create redemption request
      const { error: insertError } = await supabase
        .from("redemptions")
        .insert({
          family_id: userData.family_id,
          child_id: userId,
          reward_id: reward.id,
          stars_spent: reward.stars_cost,
          status: "pending",
          child_note: note.trim() || null,
        });

      if (insertError) throw insertError;

      // Success!
      onSuccess();
    } catch (err) {
      console.error("Error creating redemption:", err);
      setError(err instanceof Error ? err.message : "Failed to create redemption");
      setLoading(false);
    }
  };

  const remainingStars = currentStars - reward.stars_cost;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {t("rewards.requestRedemption")}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reward Info */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{reward.icon || "🎁"}</div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {getRewardName(reward)}
                  </h3>
                  {reward.category && (
                    <p className="text-sm text-gray-600">
                      {t(`rewards.category.${reward.category}` as any)}
                    </p>
                  )}
                  {reward.description && (
                    <p className="text-sm text-gray-700 mt-1">
                      {reward.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <div className="text-2xl font-bold text-primary">
                  {reward.stars_cost}
                </div>
                <div className="text-xs text-gray-500">
                  {t("common.stars")}
                </div>
              </div>
            </div>
          </div>

          {/* Balance Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800">
                Current Balance:
              </span>
              <span className="text-lg font-bold text-blue-900">
                {currentStars} ⭐
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800">Cost:</span>
              <span className="text-lg font-bold text-danger">
                -{reward.stars_cost} ⭐
              </span>
            </div>
            <div className="border-t border-blue-300 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-blue-800">
                After Redemption:
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

          {/* Note */}
          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("quests.note")} (Optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
              placeholder="When would you like this reward?"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">⏳ Note:</span> Your redemption
              request will be sent to your parents. Stars will be deducted only
              after approval!
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-gray-900 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? t("common.loading") : t("common.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
