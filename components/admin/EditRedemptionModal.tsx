"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate } from "@/lib/supabase/helpers";
import ModalFrame from "@/components/ui/ModalFrame";
import { toLocalDateString, toLocalTimeString } from "@/lib/date-utils";

type RedemptionStatus = "pending" | "approved" | "rejected" | "fulfilled";

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
  const [starsSpent, setStarsSpent] = useState<number>(redemption.stars_spent);
  const [status, setStatus] = useState<RedemptionStatus>(
    redemption.status as RedemptionStatus
  );
  const [parentResponse, setParentResponse] = useState(
    redemption.parent_response || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rewardName =
    locale === "zh-CN"
      ? redemption.rewards?.name_zh || redemption.rewards?.name_en || "Unknown"
      : redemption.rewards?.name_en || "Unknown";

  const handleSubmit = async (
    e: React.FormEvent,
    approveOverride = false
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build new created_at from date + time
      const newCreatedAt = new Date(`${date}T${time}:00`).toISOString();

      const finalStatus = approveOverride ? "approved" : status;

      const updateData: any = {
        created_at: newCreatedAt,
        stars_spent: starsSpent,
        status: finalStatus,
        parent_response: parentResponse || null,
      };

      // Set reviewed_at when approving or rejecting; clear when pending
      if (finalStatus === "approved" || finalStatus === "rejected") {
        updateData.reviewed_at = new Date().toISOString();
      } else if (finalStatus === "pending") {
        updateData.reviewed_at = null;
      }

      const { error: updateError } = await typedUpdate(
        supabase,
        "redemptions",
        updateData
      ).eq("id", redemption.id);

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
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {/* Reward Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("editRedemption.reward")}
          </label>
          <div className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-slate-300">
            {redemption.rewards?.icon || "🎁"} {rewardName}
          </div>
        </div>

        {/* Stars Spent (Editable) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("editRedemption.starsSpent")}
          </label>
          <input
            type="number"
            value={starsSpent}
            onChange={(e) => setStarsSpent(parseInt(e.target.value) || 0)}
            min="1"
            className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            required
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("editRedemption.starsSpentHint")}
          </p>
        </div>

        {/* Status Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("common.status")}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RedemptionStatus)}
            className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          >
            <option value="pending">{t("status.pending")}</option>
            <option value="approved">{t("status.approved")}</option>
            <option value="rejected">{t("status.rejected")}</option>
            <option value="fulfilled">{t("status.fulfilled")}</option>
          </select>
          {status !== redemption.status && (
            <p className="text-xs text-blue-400 mt-1">
              {t("editRedemption.statusChangeHint", {
                from: t(`status.${redemption.status}` as any),
                to: t(`status.${status}` as any),
              })}
            </p>
          )}
        </div>

        {/* Parent Note */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("editRedemption.parentNote")}
          </label>
          <textarea
            value={parentResponse}
            onChange={(e) => setParentResponse(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
            placeholder={t("editRedemption.parentNotePlaceholder")}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("common.date")}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            required
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("editRedemption.time")}
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            required
          />
        </div>

        {/* Balance Warning */}
        <p className="text-xs text-amber-400">
          {t("editRedemption.balanceWarning")}
        </p>

        {/* Quick Approve Button for Pending/Rejected */}
        {(redemption.status === "pending" || redemption.status === "rejected") && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-300 mb-2">
              {t("editRedemption.quickAction")}
            </p>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
            >
              {loading ? t("admin.processing") : t("editRedemption.saveAndApprove")}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/20 text-slate-300 rounded-lg hover:bg-white/5 transition"
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
