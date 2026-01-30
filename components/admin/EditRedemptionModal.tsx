"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ModalFrame from "@/components/ui/ModalFrame";
import { toLocalDateString, toLocalTimeString } from "@/lib/date-utils";

interface EditRedemptionModalProps {
  redemption: any;
  locale: string;
  onClose: () => void;
}

export default function EditRedemptionModal({
  redemption,
  locale,
  onClose,
}: EditRedemptionModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  // Parse the current created_at date to local date string for the input
  const currentDate = new Date(redemption.created_at);

  const [date, setDate] = useState(toLocalDateString(currentDate));
  const [time, setTime] = useState(toLocalTimeString(currentDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rewardName =
    locale === "zh-CN"
      ? redemption.rewards?.name_zh || redemption.rewards?.name_en || "Unknown"
      : redemption.rewards?.name_en || "Unknown";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build new created_at from date + time
      const newCreatedAt = new Date(`${date}T${time}:00`).toISOString();

      const { error: updateError } = await (supabase
        .from("redemptions")
        .update as any)({ created_at: newCreatedAt })
        .eq("id", redemption.id);

      if (updateError) throw updateError;

      router.refresh();
      onClose();
    } catch (err) {
      console.error("Error updating redemption:", err);
      setError(
        err instanceof Error
          ? err.message
          : t("editRedemption.updateFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      title={t("editRedemption.title")}
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {/* Reward Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("editRedemption.reward")}
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
            {redemption.rewards?.icon || "🎁"} {rewardName}
          </div>
        </div>

        {/* Stars Spent (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("editRedemption.starsSpent")}
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
            -{redemption.stars_spent} ⭐
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.date")}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            required
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("editRedemption.time")}
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            required
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition disabled:opacity-50"
          >
            {loading ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
