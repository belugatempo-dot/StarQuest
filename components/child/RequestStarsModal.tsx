"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { typedInsert } from "@/lib/supabase/helpers";
import ModalFrame from "@/components/ui/ModalFrame";
import { getTodayString } from "@/lib/date-utils";
import { getQuestName } from "@/lib/localization";
import type { Database } from "@/types/database";

type Quest = Database["public"]["Tables"]["quests"]["Row"];

interface RequestStarsModalProps {
  quest: Quest;
  locale: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestStarsModal({
  quest,
  locale,
  userId,
  onClose,
  onSuccess,
}: RequestStarsModalProps) {
  const t = useTranslations();
  const [note, setNote] = useState("");
  const [requestDate, setRequestDate] = useState<string>("");
  const [maxDate, setMaxDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Set date on client mount to avoid SSR timezone issues
  useEffect(() => {
    const today = getTodayString();
    setRequestDate(today);
    setMaxDate(today);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate note is provided
    if (!note.trim()) {
      const errorMsg = locale === "zh-CN"
        ? "请填写说明"
        : "Please provide a note describing what you did";
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      // Get family_id from the current user
      const { data: userData } = await supabase
        .from("users")
        .select("family_id")
        .eq("id", userId)
        .maybeSingle();

      if (!(userData as any)?.family_id) {
        throw new Error("Family not found");
      }

      // ========== DUPLICATE PREVENTION ==========
      // Check for existing pending request for the same quest on the same day
      const startOfDay = new Date(requestDate + "T00:00:00").toISOString();
      const endOfDay = new Date(requestDate + "T23:59:59").toISOString();

      const { data: existingPending } = await supabase
        .from("star_transactions")
        .select("id, created_at")
        .eq("child_id", userId)
        .eq("quest_id", quest.id)
        .eq("status", "pending")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay);

      if (existingPending && existingPending.length > 0) {
        const errorMsg = locale === "zh-CN"
          ? "你今天已经提交过这个任务的申请了，请等待父母审批"
          : "You already have a pending request for this quest today. Please wait for approval.";
        throw new Error(errorMsg);
      }

      // Check for rapid-fire submissions (same quest within last 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      const { data: recentRequests } = await supabase
        .from("star_transactions")
        .select("id")
        .eq("child_id", userId)
        .eq("quest_id", quest.id)
        .gte("created_at", twoMinutesAgo);

      if (recentRequests && recentRequests.length > 0) {
        const errorMsg = locale === "zh-CN"
          ? "请不要重复提交！请稍等2分钟后再试"
          : "Please don't submit repeatedly! Wait 2 minutes before trying again.";
        throw new Error(errorMsg);
      }

      // Check for rate limiting: max 2 records per minute (across all quests)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

      const { data: recentAllRequests } = await supabase
        .from("star_transactions")
        .select("id")
        .eq("child_id", userId)
        .gte("created_at", oneMinuteAgo);

      if (recentAllRequests && recentAllRequests.length >= 2) {
        const errorMsg = locale === "zh-CN"
          ? "一分钟内最多只能提交2个请求，请稍后再试"
          : "You can only submit up to 2 requests per minute. Please wait and try again.";
        throw new Error(errorMsg);
      }
      // ========== END DUPLICATE PREVENTION ==========

      // Create timestamp from selected date at current time
      const selectedDateTime = new Date(
        requestDate + "T" + new Date().toTimeString().split(" ")[0]
      );

      // Create star transaction request
      const { error: insertError } = await typedInsert(supabase, "star_transactions", {
          family_id: (userData as any).family_id,
          child_id: userId,
          quest_id: quest.id,
          stars: quest.stars,
          source: "child_request",
          status: "pending",
          child_note: note.trim() || null,
          created_by: userId,
          created_at: selectedDateTime.toISOString(),
        });

      if (insertError) throw insertError;

      // Success!
      onSuccess();
    } catch (err) {
      console.error("Error creating request:", err);
      setError(err instanceof Error ? err.message : "Failed to create request");
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      title={t("quests.requestStars")}
      onClose={onClose}
    >
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Quest Info */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{quest.icon || "⭐"}</div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {getQuestName(quest, locale)}
                  </h3>
                  {quest.category && (
                    <p className="text-sm text-slate-400">
                      {t(`quests.category.${quest.category}` as any)}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-success">
                  +{quest.stars}
                </div>
                <div className="text-xs text-slate-400">
                  {t("common.stars")}
                </div>
              </div>
            </div>
          </div>

          {/* Request Date */}
          <div>
            <label
              htmlFor="requestDate"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              {t("quests.requestDate")}
            </label>
            <input
              type="date"
              id="requestDate"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              max={maxDate || undefined}
              className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              required
            />
          </div>

          {/* Note (Required) */}
          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              {t("quests.note")} <span className="text-danger">*</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
              placeholder={locale === "zh-CN" ? "告诉爸爸妈妈你完成了什么..." : "Tell your parents how you completed this quest..."}
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              {locale === "zh-CN" ? "请描述你做了什么！" : "Please describe what you did!"}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <span className="font-semibold">💡 Note:</span> Your request will
              be sent to your parents for approval. You'll see the stars in your
              balance once approved!
            </p>
          </div>

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
              disabled={loading || !note.trim()}
              className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("common.loading") : t("common.submit")}
            </button>
          </div>
        </form>
    </ModalFrame>
  );
}
