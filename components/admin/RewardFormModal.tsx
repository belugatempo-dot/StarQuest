"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate, typedInsert } from "@/lib/supabase/helpers";
import ModalFrame from "@/components/ui/ModalFrame";
import type { Database } from "@/types/database";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];
type RewardCategory = "screen_time" | "toys" | "activities" | "treats" | "other";

interface RewardFormModalProps {
  reward?: Reward;
  familyId: string;
  locale: string;
  onClose: () => void;
  onSuccess: () => void;
}

const REWARD_CATEGORIES: RewardCategory[] = ["screen_time", "toys", "activities", "treats", "other"];

const CATEGORY_ICONS: Record<RewardCategory, string> = {
  screen_time: "📱", toys: "🧸", activities: "🎨", treats: "🍦", other: "🎁",
};

export default function RewardFormModal({
  reward, familyId, locale, onClose, onSuccess,
}: RewardFormModalProps) {
  const t = useTranslations();
  const supabase = createClient();
  const isEditMode = !!reward;

  const [nameEn, setNameEn] = useState(reward?.name_en || "");
  const [nameZh, setNameZh] = useState(reward?.name_zh || "");
  const [starsCost, setStarsCost] = useState(reward?.stars_cost || 0);
  const [category, setCategory] = useState<RewardCategory | "">(reward?.category || "");
  const [description, setDescription] = useState(reward?.description || "");
  const [icon, setIcon] = useState(reward?.icon || "🎁");
  const [isActive, setIsActive] = useState(reward?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nameEn.trim()) {
      setError(locale === "zh-CN" ? "请输入英文名称" : "English name is required");
      return;
    }
    if (starsCost <= 0) {
      setError(locale === "zh-CN" ? "星星消耗必须大于0" : "Stars cost must be greater than 0");
      return;
    }

    setLoading(true);

    try {
      const rewardData = {
        family_id: familyId,
        name_en: nameEn.trim(), name_zh: nameZh.trim() || null,
        stars_cost: starsCost, category: category || null,
        description: description.trim() || null, icon, is_active: isActive,
      };

      if (isEditMode) {
        const { error: updateError } = await typedUpdate(supabase, "rewards", rewardData).eq("id", reward.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await typedInsert(supabase, "rewards", [rewardData]);
        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error saving reward:", err);
      setError(locale === "zh-CN" ? `保存失败: ${err.message}` : `Save failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      title={isEditMode
        ? locale === "zh-CN" ? "编辑奖励" : "Edit Reward"
        : locale === "zh-CN" ? "添加奖励" : "Add Reward"}
      error={error}
      onClose={onClose}
      maxWidth="lg"
      stickyHeader
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Reward Names */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "英文名称" : "English Name"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input type="text" value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="e.g., 30 mins screen time" required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "中文名称" : "Chinese Name"}
            </label>
            <input type="text" value={nameZh}
              onChange={(e) => setNameZh(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="例如：30分钟屏幕时间"
            />
          </div>
        </div>

        {/* Stars Cost */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            {locale === "zh-CN" ? "星星消耗" : "Stars Cost"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input type="number" value={starsCost}
            onChange={(e) => setStarsCost(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            min="1" max="1000" required
          />
          <p className="text-sm text-gray-500 mt-1">
            {locale === "zh-CN" ? "兑换此奖励需要的星星数量" : "Number of stars needed to redeem this reward"}
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            {locale === "zh-CN" ? "类别" : "Category"}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {REWARD_CATEGORIES.map((cat) => (
              <button key={cat} type="button"
                onClick={() => { setCategory(cat); if (!reward?.icon) setIcon(CATEGORY_ICONS[cat]); }}
                className={`px-3 py-3 rounded-lg border-2 transition text-sm ${
                  category === cat ? "border-primary bg-primary/10 font-semibold" : "border-gray-200 hover:border-gray-300"
                }`}>
                <div className="text-2xl mb-1">{CATEGORY_ICONS[cat]}</div>
                <div>
                  {locale === "zh-CN"
                    ? { screen_time: "屏幕", toys: "玩具", activities: "活动", treats: "零食", other: "其他" }[cat]
                    : cat === "screen_time" ? "Screen" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            {locale === "zh-CN" ? "描述" : "Description"}
          </label>
          <textarea value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary resize-none"
            rows={3}
            placeholder={locale === "zh-CN" ? "描述这个奖励的详细信息..." : "Describe this reward in detail..."}
          />
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            {locale === "zh-CN" ? "图标" : "Icon"}
          </label>
          <input type="text" value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary text-2xl"
            placeholder="🎁" maxLength={4}
          />
          <p className="text-sm text-gray-500 mt-1">
            {locale === "zh-CN" ? "输入一个emoji表情" : "Enter an emoji"}
          </p>
        </div>

        {/* Active Status */}
        <div className="flex items-center space-x-3">
          <input type="checkbox" id="isActive" checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-5 h-5 text-primary focus:ring-2 focus:ring-primary rounded"
          />
          <label htmlFor="isActive" className="text-sm font-semibold cursor-pointer">
            {locale === "zh-CN" ? "启用此奖励" : "Enable this reward"}
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            {locale === "zh-CN" ? "取消" : "Cancel"}
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
            {loading
              ? locale === "zh-CN" ? "保存中..." : "Saving..."
              : isEditMode
              ? locale === "zh-CN" ? "保存更改" : "Save Changes"
              : locale === "zh-CN" ? "创建奖励" : "Create Reward"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
