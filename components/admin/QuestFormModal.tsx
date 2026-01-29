"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Quest, QuestType, QuestScope } from "@/types/quest";
import type { QuestCategory as QuestCategoryType } from "@/types/category";

interface QuestFormModalProps {
  quest?: Quest;
  familyId: string;
  locale: string;
  categories?: QuestCategoryType[];
  onClose: () => void;
  onSuccess: () => void;
}

const QUEST_TYPES: QuestType[] = ["duty", "bonus", "violation"];
const QUEST_SCOPES: QuestScope[] = ["self", "family", "other"];

// Fallback categories if none provided (for backwards compatibility)
const DEFAULT_CATEGORY_NAMES = [
  "health",
  "study",
  "chores",
  "hygiene",
  "learning",
  "social",
  "creativity",
  "exercise",
  "reading",
  "music",
  "art",
  "kindness",
  "responsibility",
  "other",
];

const DEFAULT_ICONS = {
  duty: "📋",
  bonus: "⭐",
  violation: "⚠️",
};

export default function QuestFormModal({
  quest,
  familyId,
  locale,
  categories = [],
  onClose,
  onSuccess,
}: QuestFormModalProps) {
  const t = useTranslations();
  const supabase = createClient();
  const isEditMode = !!quest;

  // Get active categories, sorted by sort_order
  const activeCategories = categories
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Form state
  const [nameEn, setNameEn] = useState(quest?.name_en || "");
  const [nameZh, setNameZh] = useState(quest?.name_zh || "");
  const [type, setType] = useState<QuestType>(quest?.type || "bonus");
  const [scope, setScope] = useState<QuestScope>(quest?.scope || "self");
  const [category, setCategory] = useState<string>(quest?.category || "");
  const [stars, setStars] = useState(quest?.stars || 0);
  const [icon, setIcon] = useState(quest?.icon || DEFAULT_ICONS.bonus);
  const [isActive, setIsActive] = useState(quest?.is_active ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update default icon when type changes
  useEffect(() => {
    if (!isEditMode) {
      setIcon(DEFAULT_ICONS[type]);
    }
  }, [type, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!nameEn.trim()) {
      setError(locale === "zh-CN" ? "请输入英文名称" : "English name is required");
      return;
    }

    setLoading(true);

    try {
      const questData = {
        family_id: familyId,
        name_en: nameEn.trim(),
        name_zh: nameZh.trim() || null,
        type,
        scope,
        category: category || null,
        stars,
        icon,
        is_active: isActive,
      };

      if (isEditMode) {
        // Update existing quest
        const { error: updateError } = await (supabase
          .from("quests")
          .update as any)(questData)
          .eq("id", quest.id);

        if (updateError) throw updateError;
      } else {
        // Create new quest
        const { error: insertError } = await (supabase
          .from("quests")
          .insert as any)([questData]);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error saving quest:", err);
      setError(
        locale === "zh-CN"
          ? `保存失败: ${err.message}`
          : `Save failed: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {isEditMode
              ? locale === "zh-CN"
                ? "编辑任务"
                : "Edit Quest"
              : locale === "zh-CN"
              ? "添加任务"
              : "Add Quest"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Quest Names */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                {locale === "zh-CN" ? "英文名称" : "English Name"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="e.g., Make the bed"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                {locale === "zh-CN" ? "中文名称" : "Chinese Name"}
              </label>
              <input
                type="text"
                value={nameZh}
                onChange={(e) => setNameZh(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="例如：整理床铺"
              />
            </div>
          </div>

          {/* Quest Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "任务类型" : "Quest Type"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {QUEST_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-3 rounded-lg border-2 transition ${
                    type === t
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {locale === "zh-CN"
                    ? { duty: "职责", bonus: "奖励", violation: "违规" }[t]
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {/* Warning for non-bonus quests */}
            {type !== "bonus" && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                {locale === "zh-CN"
                  ? "⚠️ 注意：孩子只能看到「奖励」类型的任务。「职责」和「违规」类型仅家长可见。"
                  : "⚠️ Note: Children can only see 'Bonus' quests. 'Duty' and 'Violation' quests are parent-only."}
              </div>
            )}
          </div>

          {/* Quest Scope */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "任务范围" : "Quest Scope"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {QUEST_SCOPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`px-4 py-3 rounded-lg border-2 transition ${
                    scope === s
                      ? "border-secondary bg-secondary/10 font-semibold"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {locale === "zh-CN"
                    ? { self: "自己", family: "家人", other: "他人" }[s]
                    : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "类别" : "Category"}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="">
                {locale === "zh-CN" ? "-- 选择类别 --" : "-- Select Category --"}
              </option>
              {activeCategories.length > 0 ? (
                // Use dynamic categories from database
                activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {locale === "zh-CN" && cat.name_zh ? cat.name_zh : cat.name_en}
                  </option>
                ))
              ) : (
                // Fallback to default category names if no categories provided
                DEFAULT_CATEGORY_NAMES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Stars */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "星星数量" : "Stars"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={stars}
              onChange={(e) => setStars(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              min="-100"
              max="100"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {locale === "zh-CN"
                ? "正数为奖励，负数为扣除"
                : "Positive for rewards, negative for deductions"}
            </p>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "图标" : "Icon"}
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary text-2xl"
              placeholder="📝"
              maxLength={4}
            />
            <p className="text-sm text-gray-500 mt-1">
              {locale === "zh-CN"
                ? "输入一个emoji表情"
                : "Enter an emoji"}
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-primary focus:ring-2 focus:ring-primary rounded"
            />
            <label htmlFor="isActive" className="text-sm font-semibold cursor-pointer">
              {locale === "zh-CN" ? "启用此任务" : "Enable this quest"}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              {locale === "zh-CN" ? "取消" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading
                ? locale === "zh-CN"
                  ? "保存中..."
                  : "Saving..."
                : isEditMode
                ? locale === "zh-CN"
                  ? "保存更改"
                  : "Save Changes"
                : locale === "zh-CN"
                ? "创建任务"
                : "Create Quest"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
