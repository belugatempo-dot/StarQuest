"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ModalFrame from "@/components/ui/ModalFrame";

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
  const router = useRouter();
  const supabase = createClient();

  // Parse the current created_at date to local date string for the input
  const currentDate = new Date(redemption.created_at);
  const toLocalDateString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const toLocalTimeString = (date: Date) => {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

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
          : locale === "zh-CN"
            ? "更新失败"
            : "Failed to update"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      title={locale === "zh-CN" ? "编辑兑换日期" : "Edit Redemption Date"}
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {/* Reward Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale === "zh-CN" ? "兑换奖励" : "Reward"}
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
            {redemption.rewards?.icon || "🎁"} {rewardName}
          </div>
        </div>

        {/* Stars Spent (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale === "zh-CN" ? "花费星星" : "Stars Spent"}
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
            -{redemption.stars_spent} ⭐
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale === "zh-CN" ? "日期" : "Date"}
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
            {locale === "zh-CN" ? "时间" : "Time"}
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
            {locale === "zh-CN" ? "取消" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition disabled:opacity-50"
          >
            {loading
              ? locale === "zh-CN"
                ? "保存中..."
                : "Saving..."
              : locale === "zh-CN"
                ? "保存"
                : "Save"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
