"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
  const supabase = createClient();

  const [stars, setStars] = useState(transaction.stars);
  const [parentResponse, setParentResponse] = useState(transaction.parent_response || "");
  const [customDescription, setCustomDescription] = useState(
    transaction.custom_description || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await (supabase
        .from("star_transactions")
        .update as any)({
        stars: stars,
        parent_response: parentResponse || null,
        custom_description: transaction.quest_id ? null : customDescription,
      })
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
    return locale === "zh-CN" ? "未知任务" : "Unknown quest";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {locale === "zh-CN" ? "编辑记录" : "Edit Record"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quest Name (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === "zh-CN" ? "任务" : "Quest"}
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {getQuestName()}
              </div>
              {!transaction.quest_id && (
                <p className="text-xs text-gray-500 mt-1">
                  {locale === "zh-CN"
                    ? "自定义描述可以修改"
                    : "Custom description can be edited"}
                </p>
              )}
            </div>

            {/* Custom Description (editable if no quest_id) */}
            {!transaction.quest_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === "zh-CN" ? "自定义描述" : "Custom Description"}
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
                {locale === "zh-CN" ? "星星数量" : "Stars Amount"}
              </label>
              <input
                type="number"
                value={stars}
                onChange={(e) => setStars(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {locale === "zh-CN"
                  ? "正数表示加分，负数表示扣分"
                  : "Positive for rewards, negative for deductions"}
              </p>
            </div>

            {/* Parent Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === "zh-CN" ? "家长备注" : "Parent Note"}
              </label>
              <textarea
                value={parentResponse}
                onChange={(e) => setParentResponse(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
                placeholder={
                  locale === "zh-CN" ? "添加备注（可选）" : "Add note (optional)"
                }
              />
            </div>

            {/* Date (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === "zh-CN" ? "创建日期" : "Created Date"}
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {new Date(transaction.created_at).toLocaleString(
                  locale === "zh-CN" ? "zh-CN" : "en-US"
                )}
              </div>
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
        </div>
      </div>
    </div>
  );
}
