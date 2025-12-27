"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Level = Database["public"]["Tables"]["levels"]["Row"];

interface LevelFormModalProps {
  level: Level;
  locale: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LevelFormModal({
  level,
  locale,
  onClose,
  onSuccess,
}: LevelFormModalProps) {
  const t = useTranslations();
  const supabase = createClient();

  // Form state
  const [nameEn, setNameEn] = useState(level.name_en);
  const [nameZh, setNameZh] = useState(level.name_zh || "");
  const [starsRequired, setStarsRequired] = useState(level.stars_required);
  const [icon, setIcon] = useState(level.icon || "⭐");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!nameEn.trim()) {
      setError(locale === "zh-CN" ? "请输入英文名称" : "English name is required");
      return;
    }

    if (starsRequired < 0) {
      setError(
        locale === "zh-CN"
          ? "星星要求不能为负数"
          : "Stars required cannot be negative"
      );
      return;
    }

    setLoading(true);

    try {
      const levelData = {
        name_en: nameEn.trim(),
        name_zh: nameZh.trim() || null,
        stars_required: starsRequired,
        icon,
      };

      const { error: updateError } = await (supabase
        .from("levels")
        .update as any)(levelData)
        .eq("id", level.id);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err: any) {
      console.error("Error saving level:", err);
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
            {locale === "zh-CN"
              ? `编辑等级 ${level.level_number}`
              : `Edit Level ${level.level_number}`}
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

          {/* Info Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💡 {locale === "zh-CN" ? "提示" : "Note"}:</span>{" "}
              {locale === "zh-CN"
                ? "等级编号是固定的（1-7）。星星要求应该逐级递增，以确保孩子能够稳步晋级。"
                : "Level numbers are fixed (1-7). Stars required should increase progressively to ensure children can level up gradually."}
            </p>
          </div>

          {/* Level Number (Read-only) */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "等级编号" : "Level Number"}
            </label>
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
              {level.level_number}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {locale === "zh-CN"
                ? "等级编号不可修改"
                : "Level number cannot be changed"}
            </p>
          </div>

          {/* Level Names */}
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
                placeholder="e.g., Star Master"
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
                placeholder="例如：星星大师"
              />
            </div>
          </div>

          {/* Stars Required */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "所需星星数" : "Stars Required"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={starsRequired}
              onChange={(e) => setStarsRequired(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              min="0"
              max="100000"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {locale === "zh-CN"
                ? "达到此等级所需的累计正星星总数"
                : "Total lifetime positive stars needed to reach this level"}
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
              placeholder="⭐"
              maxLength={4}
            />
            <p className="text-sm text-gray-500 mt-1">
              {locale === "zh-CN"
                ? "输入一个emoji表情"
                : "Enter an emoji"}
            </p>
          </div>

          {/* Suggested Icons */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {locale === "zh-CN" ? "建议图标" : "Suggested Icons"}
            </label>
            <div className="flex flex-wrap gap-2">
              {["🌱", "🔍", "🎒", "⚔️", "🦸", "👑", "⭐", "💎", "🏆", "🌟", "✨", "🎖️"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-3xl px-3 py-2 rounded-lg border-2 transition ${
                    icon === emoji
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
                : locale === "zh-CN"
                ? "保存更改"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
