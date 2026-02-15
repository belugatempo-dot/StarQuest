"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate } from "@/lib/supabase/helpers";
import { useTranslations } from "next-intl";
import ModalFrame from "@/components/ui/ModalFrame";
import { getQuestName } from "@/lib/localization";
import type { Database } from "@/types/database";

type Transaction = Database["public"]["Tables"]["star_transactions"]["Row"] & {
  quests: {
    name_en: string;
    name_zh: string | null;
    icon: string | null;
  } | null;
};

interface ResubmitRequestModalProps {
  transaction: Transaction;
  locale: string;
  onClose: () => void;
}

export default function ResubmitRequestModal({
  transaction,
  locale,
  onClose,
}: ResubmitRequestModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [stars, setStars] = useState(transaction.stars);
  const [childNote, setChildNote] = useState(transaction.child_note || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questDisplayName = transaction.custom_description
    || getQuestName(transaction.quests, locale);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate note is provided
    if (!childNote.trim()) {
      setError(
        locale === "zh-CN"
          ? "请填写说明"
          : "Please provide a note describing what you did"
      );
      setLoading(false);
      return;
    }

    try {
      // Update the transaction: reset status to pending and update details
      const { error: updateError } = await typedUpdate(supabase, "star_transactions", {
        stars: stars,
        child_note: childNote || null,
        status: "pending",
        parent_response: null, // Clear previous rejection reason
      })
        .eq("id", transaction.id);

      if (updateError) throw updateError;

      router.refresh();
      onClose();
    } catch (err) {
      console.error("Error resubmitting request:", err);
      setError(
        locale === "zh-CN"
          ? "重新提交失败，请重试"
          : "Failed to resubmit, please try again"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      title={locale === "zh-CN" ? "重新提交请求" : "Resubmit Request"}
      onClose={onClose}
    >
        <div className="px-6 pb-6">
          {/* Previous Rejection Reason */}
          {transaction.parent_response && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm font-semibold text-red-300 mb-1">
                {locale === "zh-CN" ? "被拒绝原因：" : "Rejection reason:"}
              </p>
              <p className="text-sm text-red-400">{transaction.parent_response}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quest Name (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {locale === "zh-CN" ? "任务" : "Quest"}
              </label>
              <div className="flex items-center px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-slate-300">
                <span className="text-2xl mr-2">
                  {transaction.quests?.icon || "⭐"}
                </span>
                {questDisplayName}
              </div>
            </div>

            {/* Stars */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {locale === "zh-CN" ? "请求星星数" : "Requested Stars"}
              </label>
              <input
                type="number"
                value={stars}
                onChange={(e) => setStars(parseInt(e.target.value) || 0)}
                min={1}
                max={100}
                className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                required
              />
            </div>

            {/* Child Note (Required) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {locale === "zh-CN" ? "说明" : "Note"} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={childNote}
                onChange={(e) => setChildNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
                placeholder={
                  locale === "zh-CN"
                    ? "告诉爸爸妈妈你完成了什么..."
                    : "Tell your parents what you did..."
                }
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                {locale === "zh-CN"
                  ? "请描述你做了什么！"
                  : "Please describe what you did!"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-white/20 text-slate-300 rounded-lg hover:bg-white/5 transition"
              >
                {locale === "zh-CN" ? "取消" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={loading || stars < 1 || !childNote.trim()}
                className="flex-1 px-4 py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {loading
                  ? locale === "zh-CN"
                    ? "提交中..."
                    : "Submitting..."
                  : locale === "zh-CN"
                  ? "重新提交"
                  : "Resubmit"}
              </button>
            </div>
          </form>
        </div>
    </ModalFrame>
  );
}
