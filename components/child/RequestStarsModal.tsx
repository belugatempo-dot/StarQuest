"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Quest = Database["public"]["Tables"]["quests"]["Row"];

interface RequestStarsModalProps {
  quest: Quest;
  locale: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper function to get local date string (YYYY-MM-DD)
const getLocalDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
    const today = getLocalDateString();
    setRequestDate(today);
    setMaxDate(today);
  }, []);

  const getQuestName = (q: Quest) => {
    return locale === "zh-CN" ? q.name_zh || q.name_en : q.name_en;
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
        .maybeSingle();

      if (!(userData as any)?.family_id) {
        throw new Error("Family not found");
      }

      // Create timestamp from selected date at current time
      const selectedDateTime = new Date(
        requestDate + "T" + new Date().toTimeString().split(" ")[0]
      );

      // Create star transaction request
      const { error: insertError } = await (supabase
        .from("star_transactions")
        .insert as any)({
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("quests.requestStars")}</h2>
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
          {/* Quest Info */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{quest.icon || "⭐"}</div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {getQuestName(quest)}
                  </h3>
                  {quest.category && (
                    <p className="text-sm text-gray-600">
                      {t(`quests.category.${quest.category}` as any)}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-success">
                  +{quest.stars}
                </div>
                <div className="text-xs text-gray-500">
                  {t("common.stars")}
                </div>
              </div>
            </div>
          </div>

          {/* Request Date */}
          <div>
            <label
              htmlFor="requestDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("quests.requestDate")}
            </label>
            <input
              type="date"
              id="requestDate"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              max={maxDate || undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              required
            />
          </div>

          {/* Note */}
          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("quests.note")} ({t("common.optional")})
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
              placeholder="Tell your parents how you completed this quest..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Help your parents understand what you did!
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("common.loading") : t("common.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
