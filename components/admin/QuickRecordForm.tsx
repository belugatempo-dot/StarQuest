"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedInsert } from "@/lib/supabase/helpers";
import { getTodayString, combineDateWithCurrentTime } from "@/lib/date-utils";
import { getQuestName } from "@/lib/localization";
import { trackStarRecordedByParent } from "@/lib/analytics/events";
import type { Database } from "@/types/database";

type User = Database["public"]["Tables"]["users"]["Row"];
type Quest = Database["public"]["Tables"]["quests"]["Row"];

const COLOR_VARIANTS = {
  success: {
    selectedBorder: "border-success bg-success/10",
    starsClass: "text-success",
  },
  warning: {
    selectedBorder: "border-warning bg-warning/10",
    starsClass: "text-warning",
  },
  danger: {
    selectedBorder: "border-danger bg-danger/10",
    starsClass: "text-danger",
  },
} as const;

interface QuestCardGroupProps {
  quests: Quest[];
  sectionIcon: string;
  sectionLabel: string;
  colorVariant: keyof typeof COLOR_VARIANTS;
  defaultQuestIcon: string;
  selectedQuestId: string;
  onSelectQuest: (questId: string) => void;
  locale: string;
}

function QuestCardGroup({
  quests,
  sectionIcon,
  sectionLabel,
  colorVariant,
  defaultQuestIcon,
  selectedQuestId,
  onSelectQuest,
  locale,
}: QuestCardGroupProps) {
  if (quests.length === 0) return null;

  const colors = COLOR_VARIANTS[colorVariant];

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
        <span className="text-xl">{sectionIcon}</span>
        <span>{sectionLabel}</span>
      </label>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {quests.map((quest) => (
          <div
            key={quest.id}
            onClick={() => onSelectQuest(quest.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              selectedQuestId === quest.id
                ? colors.selectedBorder
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{quest.icon || defaultQuestIcon}</span>
                <span className="font-medium text-sm">
                  {getQuestName(quest, locale)}
                </span>
              </div>
              <span className={`${colors.starsClass} font-bold`}>
                {quest.stars >= 0 ? "+" : ""}{quest.stars}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FormState {
  selectedChild: string;
  selectedQuest: string;
  customDescription: string;
  customStars: number;
}

function validateForm({ selectedChild, selectedQuest, customDescription, customStars }: FormState): string | null {
  if (!selectedChild) return "Please select a child";
  if (!selectedQuest && !customDescription) return "Please select a quest or enter a custom description";
  if (!selectedQuest && customDescription && customStars === 0) return "Please enter the number of stars";
  return null;
}

interface TransactionPayloadParams {
  familyId: string;
  selectedChild: string;
  selectedQuest: string;
  customDescription: string;
  starsToRecord: number;
  parentNote: string;
  parentId: string;
  recordDate: string;
}

function buildTransactionPayload({
  familyId,
  selectedChild,
  selectedQuest,
  customDescription,
  starsToRecord,
  parentNote,
  parentId,
  recordDate,
}: TransactionPayloadParams) {
  const selectedDateTime = combineDateWithCurrentTime(recordDate);
  const isCustom = !selectedQuest && customDescription;

  return {
    family_id: familyId,
    child_id: selectedChild,
    quest_id: selectedQuest || null,
    custom_description: isCustom ? customDescription : null,
    stars: starsToRecord,
    source: "parent_record" as const,
    status: "approved" as const,
    parent_response: parentNote || null,
    created_by: parentId,
    reviewed_by: parentId,
    created_at: selectedDateTime.toISOString(),
    reviewed_at: selectedDateTime.toISOString(),
  };
}

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

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Fix SSR hydration mismatch: set correct date on client mount
  useEffect(() => {
    const today = getTodayString();
    setRecordDate(today);
    setMaxDate(today);
  }, []);

  const selectedQuestData = quests.find((q) => q.id === selectedQuest);

  // Auto-select child if there's only one
  useEffect(() => {
    if (children.length === 1 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Single-pass quest grouping
  const { bonus: bonusQuests, duty: dutyQuests, violation: violationQuests } = useMemo(() => {
    const grouped: Record<string, Quest[]> = { bonus: [], duty: [], violation: [] };
    for (const quest of quests) {
      if (quest.type in grouped) grouped[quest.type].push(quest);
    }
    return grouped as { bonus: Quest[]; duty: Quest[]; violation: Quest[] };
  }, [quests]);

  const handleQuestSelect = (questId: string) => {
    setSelectedQuest(questId);
    setCustomDescription("");
    setCustomStars(0);
    setMultiplier(1);
  };

  const resetForm = () => {
    setSelectedChild("");
    setSelectedQuest("");
    setCustomDescription("");
    setCustomStars(0);
    setMultiplier(1);
    setParentNote("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const validationError = validateForm({
      selectedChild,
      selectedQuest,
      customDescription,
      customStars,
    });
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const baseStars = selectedQuestData?.stars || customStars;
      const starsToRecord = baseStars * multiplier;

      const payload = buildTransactionPayload({
        familyId,
        selectedChild,
        selectedQuest,
        customDescription,
        starsToRecord,
        parentNote,
        parentId,
        recordDate,
      });

      const { error: insertError } = await typedInsert(supabase, "star_transactions", payload);

      if (insertError) throw insertError;

      trackStarRecordedByParent({
        childId: selectedChild,
        questId: selectedQuest || null,
        stars: starsToRecord,
        multiplier,
      });

      setSuccess(true);
      resetForm();
      router.refresh();

      // Hide success message after 3 seconds
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error recording stars:", err);
      setError(err instanceof Error ? err.message : "Failed to record stars");
    } finally {
      setLoading(false);
    }
  };

  const isCustom = !selectedQuest && customDescription;

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

      {/* Quest Sections */}
      <QuestCardGroup
        quests={bonusQuests}
        sectionIcon="⭐"
        sectionLabel="Did Good / 做了好事 (Bonus)"
        colorVariant="success"
        defaultQuestIcon="⭐"
        selectedQuestId={selectedQuest}
        onSelectQuest={handleQuestSelect}
        locale={locale}
      />

      <QuestCardGroup
        quests={dutyQuests}
        sectionIcon="📋"
        sectionLabel="Missed Duty / 漏做本分"
        colorVariant="warning"
        defaultQuestIcon="📋"
        selectedQuestId={selectedQuest}
        onSelectQuest={handleQuestSelect}
        locale={locale}
      />

      <QuestCardGroup
        quests={violationQuests}
        sectionIcon="⚠️"
        sectionLabel="Violation / 违规了"
        colorVariant="danger"
        defaultQuestIcon="⚠️"
        selectedQuestId={selectedQuest}
        onSelectQuest={handleQuestSelect}
        locale={locale}
      />

      {/* Multiplier for selected quest */}
      {selectedQuestData && (
        <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg p-4">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            {t("admin.adjustMultiplier")}
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">
                  {t("admin.multiplierLabel")}
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
                💡 {t("admin.multiplierExample")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 mb-1">
                {t("admin.actualStars")}
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
            ⚠️ {t("admin.selectChildFirst")}
          </div>
        )}
        {selectedChild && !selectedQuest && !customDescription && !success && (
          <div className="text-sm text-red-600 text-center">
            ⚠️ {t("admin.selectQuestOrCustom")}
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
