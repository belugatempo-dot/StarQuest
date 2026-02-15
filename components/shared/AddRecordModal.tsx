"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedInsert } from "@/lib/supabase/helpers";
import { getQuestName } from "@/lib/localization";
import { formatDateOnly } from "@/lib/date-utils";
import ModalFrame from "@/components/ui/ModalFrame";
import type { Database } from "@/types/database";
import type { ActivityRole } from "@/types/activity";

type Quest = Database["public"]["Tables"]["quests"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface AddRecordModalProps {
  date: string; // YYYY-MM-DD
  role: ActivityRole;
  locale: string;
  quests: Quest[];
  children?: User[];
  currentUserId: string;
  familyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddRecordModal({
  date,
  role,
  locale,
  quests,
  children,
  currentUserId,
  familyId,
  onClose,
  onSuccess,
}: AddRecordModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedQuest, setSelectedQuest] = useState<string>("");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isParent = role === "parent";
  const selectedQuestData = quests.find((q) => q.id === selectedQuest);

  // Auto-select child if parent with only one child
  useEffect(() => {
    if (isParent && children && children.length === 1 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [isParent, children, selectedChild]);

  // For child mode, the child is the current user
  const childId = isParent ? selectedChild : currentUserId;

  // Group quests by type
  const bonusQuests = quests.filter((q) => q.type === "bonus");
  const dutyQuests = quests.filter((q) => q.type === "duty");
  const violationQuests = quests.filter((q) => q.type === "violation");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate child selection (parent mode)
    if (isParent && !selectedChild) {
      setError(t("activity.selectChild"));
      setLoading(false);
      return;
    }

    // Validate quest selection
    if (!selectedQuest) {
      setError(t("activity.selectQuest"));
      setLoading(false);
      return;
    }

    // Validate note for child mode
    if (!isParent && !note.trim()) {
      setError(t("activity.childNoteRequired"));
      setLoading(false);
      return;
    }

    try {
      // Child mode: duplicate prevention + rate limiting
      if (!isParent) {
        // Check for existing pending request for same quest on same day
        const startOfDay = new Date(date + "T00:00:00").toISOString();
        const endOfDay = new Date(date + "T23:59:59").toISOString();

        const { data: existingPending } = await supabase
          .from("star_transactions")
          .select("id")
          .eq("child_id", currentUserId)
          .eq("quest_id", selectedQuest)
          .eq("status", "pending")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay);

        if (existingPending && existingPending.length > 0) {
          throw new Error(t("activity.duplicatePending"));
        }

        // Check for rapid-fire submissions (same quest within last 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

        const { data: recentRequests } = await supabase
          .from("star_transactions")
          .select("id")
          .eq("child_id", currentUserId)
          .eq("quest_id", selectedQuest)
          .gte("created_at", twoMinutesAgo);

        if (recentRequests && recentRequests.length > 0) {
          throw new Error(t("activity.rateLimited"));
        }

        // Rate limiting: max 2 records per minute (across all quests)
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

        const { data: recentAllRequests } = await supabase
          .from("star_transactions")
          .select("id")
          .eq("child_id", currentUserId)
          .gte("created_at", oneMinuteAgo);

        if (recentAllRequests && recentAllRequests.length >= 2) {
          throw new Error(t("activity.rateLimited"));
        }
      }

      // Calculate stars with multiplier
      const quest = quests.find((q) => q.id === selectedQuest);
      if (!quest) throw new Error("Quest not found");

      const starsToRecord = quest.stars * multiplier;

      // Create timestamp from selected date at current time
      const selectedDateTime = new Date(
        date + "T" + new Date().toTimeString().split(" ")[0]
      );

      const insertData: Record<string, unknown> = {
        family_id: familyId,
        child_id: childId,
        quest_id: selectedQuest,
        stars: starsToRecord,
        source: isParent ? "parent_record" : "child_request",
        status: isParent ? "approved" : "pending",
        created_by: currentUserId,
        created_at: selectedDateTime.toISOString(),
      };

      if (isParent) {
        insertData.parent_response = note.trim() || null;
        insertData.reviewed_by = currentUserId;
        insertData.reviewed_at = selectedDateTime.toISOString();
      } else {
        insertData.child_note = note.trim() || null;
      }

      const { error: insertError } = await typedInsert(
        supabase,
        "star_transactions",
        insertData as any
      );

      if (insertError) throw insertError;

      router.refresh();
      onSuccess();
    } catch (err) {
      console.error("Error creating record:", err);
      setError(err instanceof Error ? err.message : "Failed to create record");
      setLoading(false);
    }
  };

  const title = isParent
    ? t("activity.addRecordForDate", { date: formatDateOnly(date, locale) })
    : t("activity.requestStarsForDate", { date: formatDateOnly(date, locale) });

  const canSubmit = isParent
    ? !!selectedChild && !!selectedQuest
    : !!selectedQuest && !!note.trim();

  return (
    <ModalFrame
      title={title}
      onClose={onClose}
      error={error}
      maxWidth="lg"
      stickyHeader
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {/* Child Selector (parent mode only) */}
        {isParent && children && children.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t("activity.selectChild")}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChild(child.id)}
                  className={`p-3 border-2 rounded-lg transition text-left ${
                    selectedChild === child.id
                      ? "border-secondary bg-secondary/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">
                      {child.avatar_url || "👤"}
                    </span>
                    <span className="font-medium text-sm">{child.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quest Selection */}
        {quests.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            {t("activity.noQuestsAvailable")}
          </div>
        ) : (
          <>
            {/* Bonus Quests */}
            {bonusQuests.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                  <span className="text-lg">⭐</span>
                  <span>{locale === "zh-CN" ? "做了好事 (加分)" : "Did Good (Bonus)"}</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {bonusQuests.map((quest) => (
                    <button
                      key={quest.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuest(quest.id);
                        setMultiplier(1);
                      }}
                      className={`p-3 border-2 rounded-lg transition text-left ${
                        selectedQuest === quest.id
                          ? "border-success bg-success/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{quest.icon || "⭐"}</span>
                          <span className="font-medium text-xs">
                            {getQuestName(quest, locale)}
                          </span>
                        </div>
                        <span className="text-success font-bold text-sm">+{quest.stars}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duty Quests (parent only) */}
            {isParent && dutyQuests.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                  <span className="text-lg">📋</span>
                  <span>{locale === "zh-CN" ? "漏做本分" : "Missed Duty"}</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dutyQuests.map((quest) => (
                    <button
                      key={quest.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuest(quest.id);
                        setMultiplier(1);
                      }}
                      className={`p-3 border-2 rounded-lg transition text-left ${
                        selectedQuest === quest.id
                          ? "border-warning bg-warning/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{quest.icon || "📋"}</span>
                          <span className="font-medium text-xs">
                            {getQuestName(quest, locale)}
                          </span>
                        </div>
                        <span className="text-warning font-bold text-sm">{quest.stars}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Violation Quests (parent only) */}
            {isParent && violationQuests.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                  <span className="text-lg">⚠️</span>
                  <span>{locale === "zh-CN" ? "违规了" : "Violation"}</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {violationQuests.map((quest) => (
                    <button
                      key={quest.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuest(quest.id);
                        setMultiplier(1);
                      }}
                      className={`p-3 border-2 rounded-lg transition text-left ${
                        selectedQuest === quest.id
                          ? "border-danger bg-danger/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{quest.icon || "⚠️"}</span>
                          <span className="font-medium text-xs">
                            {getQuestName(quest, locale)}
                          </span>
                        </div>
                        <span className="text-danger font-bold text-sm">{quest.stars}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Multiplier (when quest selected, parent mode) */}
        {isParent && selectedQuestData && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-300">
                  {locale === "zh-CN" ? "倍数:" : "Multiplier:"}
                </label>
                <input
                  type="number"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="10"
                  className="w-16 px-2 py-1 border border-blue-500/30 rounded text-center font-bold text-sm"
                />
                <span className="text-xs text-slate-400">(1-10x)</span>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${
                  selectedQuestData.stars >= 0 ? "text-success" : "text-danger"
                }`}>
                  {selectedQuestData.stars >= 0 ? "+" : ""}
                  {selectedQuestData.stars * multiplier}
                </div>
                <div className="text-xs text-slate-400">
                  {selectedQuestData.stars} x {multiplier}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {isParent
              ? t("activity.parentNote")
              : t("activity.childNoteRequired")}
            {!isParent && <span className="text-danger"> *</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none text-sm"
            placeholder={
              isParent
                ? locale === "zh-CN" ? "例如：做得很好！" : "e.g., Great job!"
                : locale === "zh-CN" ? "告诉爸爸妈妈你做了什么..." : "Tell your parents what you did..."
            }
            required={!isParent}
          />
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
            disabled={loading || !canSubmit}
            className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? t("common.loading")
              : isParent
                ? t("activity.addRecord")
                : t("activity.requestStars")}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
