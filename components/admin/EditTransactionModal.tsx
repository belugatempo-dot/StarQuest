"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate } from "@/lib/supabase/helpers";
import ModalFrame from "@/components/ui/ModalFrame";
import type { Database } from "@/types/database";

type Transaction = Database["public"]["Tables"]["star_transactions"]["Row"] & {
  quests?: {
    name_en: string;
    name_zh: string | null;
  } | null;
};

interface EditTransactionModalProps {
  transaction: Transaction;
  locale: string;
  onClose: () => void;
}

export default function EditTransactionModal({
  transaction,
  locale,
  onClose,
}: EditTransactionModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [stars, setStars] = useState(transaction.stars);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
    transaction.status as "pending" | "approved" | "rejected"
  );
  const [parentResponse, setParentResponse] = useState(transaction.parent_response || "");
  const [customDescription, setCustomDescription] = useState(
    transaction.custom_description || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, approveRejected = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateData: any = {
        stars: stars,
        parent_response: parentResponse || null,
        custom_description: transaction.quest_id ? null : customDescription,
      };

      // If changing status (e.g., approving a rejected record)
      if (approveRejected || status !== transaction.status) {
        updateData.status = approveRejected ? "approved" : status;
      }

      const { error: updateError } = await typedUpdate(supabase, "star_transactions", updateData)
        .eq("id", transaction.id);

      if (updateError) throw updateError;

      router.refresh();
      onClose();
    } catch (err) {
      console.error("Error updating transaction:", err);
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const getQuestName = () => {
    if (transaction.custom_description) {
      return transaction.custom_description;
    }
    if (transaction.quests) {
      return locale === "zh-CN"
        ? transaction.quests.name_zh || transaction.quests.name_en
        : transaction.quests.name_en;
    }
    return t("editTransaction.unknownQuest");
  };

  return (
    <ModalFrame
      title={t("editTransaction.title")}
      error={error}
      onClose={onClose}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {/* Quest Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("editTransaction.quest")}
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
            {getQuestName()}
          </div>
          {!transaction.quest_id && (
            <p className="text-xs text-gray-500 mt-1">
              {t("editTransaction.customDescEditable")}
            </p>
          )}
        </div>

        {/* Custom Description (editable if no quest_id) */}
        {!transaction.quest_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("editTransaction.customDescription")}
            </label>
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              required
            />
          </div>
        )}

        {/* Stars */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("editTransaction.starsAmount")}
          </label>
          <input
            type="number"
            value={stars}
            onChange={(e) => setStars(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {t("editTransaction.starsHint")}
          </p>
        </div>

        {/* Parent Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("editTransaction.parentNote")}
          </label>
          <textarea
            value={parentResponse}
            onChange={(e) => setParentResponse(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
            placeholder={t("editTransaction.parentNotePlaceholder")}
          />
        </div>

        {/* Status Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.status")}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "pending" | "approved" | "rejected")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          >
            <option value="approved">
              {t("status.approved")}
            </option>
            <option value="pending">
              {t("status.pending")}
            </option>
            <option value="rejected">
              {t("status.rejected")}
            </option>
          </select>
          {status !== transaction.status && (
            <p className="text-xs text-blue-600 mt-1">
              {t("editTransaction.statusChangeHint", {
                from: t(`status.${transaction.status}` as any),
                to: t(`status.${status}` as any),
              })}
            </p>
          )}
        </div>

        {/* Date (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("editTransaction.createdDate")}
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
            {new Date(transaction.created_at).toLocaleString(
              locale === "zh-CN" ? "zh-CN" : "en-US"
            )}
          </div>
        </div>

        {/* Quick Approve Button for Rejected/Pending */}
        {(transaction.status === "rejected" || transaction.status === "pending") && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 mb-2">
              {t("editTransaction.quickAction")}
            </p>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
            >
              {loading ? t("admin.processing") : t("editTransaction.saveAndApprove")}
            </button>
          </div>
        )}

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
