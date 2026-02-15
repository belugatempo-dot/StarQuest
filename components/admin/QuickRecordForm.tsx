"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedInsert } from "@/lib/supabase/helpers";
import { getTodayString } from "@/lib/date-utils";
import { getQuestName } from "@/lib/localization";
import type { Database } from "@/types/database";

type User = Database["public"]["Tables"]["users"]["Row"];
type Quest = Database["public"]["Tables"]["quests"]["Row"];

interface QuickRecordFormProps {
  familyChildren: User[];
  quests: Quest[];
  locale: string;
  parentId: string;
  familyId: string;
}

export default function QuickRecordForm({
  familyChildren: children,
  quests,
  locale,
  parentId,
  familyId,
}: QuickRecordFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedQuest, setSelectedQuest] = useState<string>("");
  const [customDescription, setCustomDescription] = useState("");
  const [customStars, setCustomStars] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [parentNote, setParentNote] = useState("");
  // Initialize empty - will be set by useEffect on client to avoid SSR timezone issues
  const [recordDate, setRecordDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Store max date in state to avoid SSR timezone mismatch
  const [maxDate, setMaxDate] = useState<string>("");

  // Fix SSR hydration mismatch: set correct date on client mount
  useEffect(() => {
    const today = getTodayString();
    setRecordDate(today);
    setMaxDate(today);
  }, []);

  const selectedQuestData = quests.find((q) => q.id === selectedQuest);
  const isCustom = !selectedQuest && customDescription;

  // Auto-select child if there's only one
  useEffect(() => {
    if (children.length === 1 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!selectedChild) {
      setError("Please select a child");
      setLoading(false);
      return;
    }

    if (!selectedQuest && !customDescription) {
      setError("Please select a quest or enter a custom description");
      setLoading(false);
      return;
    }

    if (isCustom && customStars === 0) {
      setError("Please enter the number of stars");
      setLoading(false);
      return;
    }

    try {
      // Calculate stars with multiplier
      const baseStars = selectedQuestData?.stars || customStars;
      const starsToRecord = baseStars * multiplier;

      // Create timestamp from selected date at current time
      const selectedDateTime = new Date(recordDate + "T" + new Date().toTimeString().split(" ")[0]);

      const { error: insertError } = await typedInsert(supabase, "star_transactions", {
          family_id: familyId,
          child_id: selectedChild,
          quest_id: selectedQuest || null,
          custom_description: isCustom ? customDescription : null,
          stars: starsToRecord,
          source: "parent_record",
          status: "approved", // 家长直接记录，自动批准
          parent_response: parentNote || null,
          created_by: parentId,
          reviewed_by: parentId,
          created_at: selectedDateTime.toISOString(),
          reviewed_at: selectedDateTime.toISOString(),
        });

      if (insertError) throw insertError;

      // Success!
      setSuccess(true);

      // Reset form (keep recordDate for consecutive entries on same day)
      setSelectedChild("");
      setSelectedQuest("");
      setCustomDescription("");
      setCustomStars(0);
      setMultiplier(1);
      setParentNote("");

      // Refresh page data
      router.refresh();

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error recording stars:", err);
      setError(err instanceof Error ? err.message : "Failed to record stars");
    } finally {
      setLoading(false);
    }
  };

  // Group quests by type
  const bonusQuests = quests.filter((q) => q.type === "bonus");
  const dutyQuests = quests.filter((q) => q.type === "duty");
  const violationQuests = quests.filter((q) => q.type === "violation");

  return (
    <form onSubmit={handleSubmit} className="dark-card rounded-lg shadow-md p-6 space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-success/10 border border-success text-success px-4 py-3 rounded flex items-center">
          <span className="mr-2">✓</span>
          {t("admin.recordSuccess")}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Select Child */}
      <div className={`${!selectedChild && children.length > 1 ? 'ring-2 ring-red-300 rounded-lg p-4' : ''}`}>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("admin.selectChild")} {children.length > 1 ? '*' : ''}
        </label>
        {children.length === 0 ? (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-300 text-sm">
            No children in your family yet. Add a child in Family Management.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((child) => (
              <div
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedChild === child.id
                    ? "border-secondary bg-secondary/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-xl">
                    {child.avatar_url || "👤"}
                  </div>
                  <div>
                    <div className="font-semibold">{child.name}</div>
                    <div className="text-xs text-slate-400">
                      {locale === child.locale ? "Same language" : child.locale}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Date */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("admin.recordDate")} *
        </label>
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          max={maxDate || undefined}
          className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          required
        />
      </div>

      {/* Bonus Quests - Did Good */}
      {bonusQuests.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
            <span className="text-xl">⭐</span>
            <span>Did Good / 做了好事 (Bonus)</span>
          </label>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bonusQuests.map((quest) => (
              <div
                key={quest.id}
                onClick={() => {
                  setSelectedQuest(quest.id);
                  setCustomDescription("");
                  setCustomStars(0);
                  setMultiplier(1);
                }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedQuest === quest.id
                    ? "border-success bg-success/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{quest.icon || "⭐"}</span>
                    <span className="font-medium text-sm">
                      {getQuestName(quest, locale)}
                    </span>
                  </div>
                  <span className="text-success font-bold">+{quest.stars}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duty Quests - Missed Duty */}
      {dutyQuests.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
            <span className="text-xl">📋</span>
            <span>Missed Duty / 漏做本分</span>
          </label>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dutyQuests.map((quest) => (
              <div
                key={quest.id}
                onClick={() => {
                  setSelectedQuest(quest.id);
                  setCustomDescription("");
                  setCustomStars(0);
                  setMultiplier(1);
                }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedQuest === quest.id
                    ? "border-warning bg-warning/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{quest.icon || "📋"}</span>
                    <span className="font-medium text-sm">
                      {getQuestName(quest, locale)}
                    </span>
                  </div>
                  <span className="text-warning font-bold">{quest.stars}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Violation Quests */}
      {violationQuests.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
            <span className="text-xl">⚠️</span>
            <span>Violation / 违规了</span>
          </label>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {violationQuests.map((quest) => (
              <div
                key={quest.id}
                onClick={() => {
                  setSelectedQuest(quest.id);
                  setCustomDescription("");
                  setCustomStars(0);
                  setMultiplier(1);
                }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedQuest === quest.id
                    ? "border-danger bg-danger/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{quest.icon || "⚠️"}</span>
                    <span className="font-medium text-sm">
                      {getQuestName(quest, locale)}
                    </span>
                  </div>
                  <span className="text-danger font-bold">{quest.stars}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multiplier for selected quest */}
      {selectedQuestData && (
        <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg p-4">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            {locale === "zh-CN" ? "调整倍数 / 程度" : "Adjust Multiplier / Severity"}
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">
                  {locale === "zh-CN" ? "倍数:" : "Multiplier:"}
                </span>
                <input
                  type="number"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="10"
                  step="1"
                  className="w-20 px-3 py-2 border-2 border-blue-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-bold"
                />
                <span className="text-sm text-slate-400">
                  (1-10×)
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {locale === "zh-CN"
                  ? "💡 例如：超过10分钟 = 1×，超过20分钟 = 2×，以此类推"
                  : "💡 Example: 10 mins over = 1×, 20 mins over = 2×, etc."}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 mb-1">
                {locale === "zh-CN" ? "实际星星:" : "Actual Stars:"}
              </div>
              <div className={`text-3xl font-bold ${
                (selectedQuestData.stars || 0) >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {selectedQuestData.stars >= 0 ? '+' : ''}{selectedQuestData.stars * multiplier}
              </div>
              <div className="text-xs text-slate-400">
                {selectedQuestData.stars} × {multiplier}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("admin.orCustom")}
        </label>
        <div className="space-y-3">
          <input
            type="text"
            value={customDescription}
            onChange={(e) => {
              setCustomDescription(e.target.value);
              if (e.target.value) setSelectedQuest("");
            }}
            className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            placeholder="e.g., Helped neighbor carry groceries"
          />
          {customDescription && (
            <div className="flex items-center space-x-4">
              <input
                type="number"
                value={customStars || ""}
                onChange={(e) => setCustomStars(parseInt(e.target.value) || 0)}
                className="w-32 px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                placeholder="Stars"
              />
              <span className="text-sm text-slate-400">
                Enter positive (+) or negative (-) number
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Parent Note */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("admin.recordNote")}
        </label>
        <textarea
          value={parentNote}
          onChange={(e) => setParentNote(e.target.value)}
          rows={2}
          className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
          placeholder="e.g., Great job today!"
        />
      </div>

      {/* Submit Button */}
      <div className="space-y-2">
        {!selectedChild && !success && (
          <div className="text-sm text-red-600 text-center">
            ⚠️ {locale === "zh-CN" ? "请先选择一个孩子" : "Please select a child first"}
          </div>
        )}
        {selectedChild && !selectedQuest && !customDescription && !success && (
          <div className="text-sm text-red-600 text-center">
            ⚠️ {locale === "zh-CN" ? "请选择一个任务或输入自定义描述" : "Please select a quest or enter custom description"}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !selectedChild || (!selectedQuest && !customDescription)}
          className="w-full bg-secondary text-white py-3 px-6 rounded-lg font-semibold hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t("admin.processing") : t("admin.recordStars")}
        </button>
      </div>
    </form>
  );
}
