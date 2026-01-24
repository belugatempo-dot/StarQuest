"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { QuestCategory, QuestCategoryInsert } from "@/types/category";

interface CategoryManagementProps {
  categories: QuestCategory[];
  locale: string;
  familyId: string;
  onCategoriesChange?: () => void;
}

export default function CategoryManagement({
  categories,
  locale,
  familyId,
  onCategoriesChange,
}: CategoryManagementProps) {
  const router = useRouter();
  const supabase = createClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<QuestCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    name_zh: "",
    icon: "📦",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      name_zh: "",
      icon: "📦",
    });
    setShowAddForm(false);
    setEditingCategory(null);
    setError("");
  };

  const handleEdit = (category: QuestCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      name_en: category.name_en,
      name_zh: category.name_zh || "",
      icon: category.icon,
    });
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name_en.trim()) {
      setError(locale === "zh-CN" ? "请输入英文名称" : "English name is required");
      return;
    }

    // Generate name from name_en if not provided
    const name = formData.name.trim() || formData.name_en.toLowerCase().replace(/\s+/g, "_");

    setLoading(true);

    try {
      if (editingCategory) {
        // Update existing category
        const { error: updateError } = await (supabase
          .from("quest_categories")
          .update as any)({
            name,
            name_en: formData.name_en.trim(),
            name_zh: formData.name_zh.trim() || null,
            icon: formData.icon,
          })
          .eq("id", editingCategory.id);

        if (updateError) throw updateError;
      } else {
        // Create new category
        const newCategory: QuestCategoryInsert = {
          family_id: familyId,
          name,
          name_en: formData.name_en.trim(),
          name_zh: formData.name_zh.trim() || null,
          icon: formData.icon,
          sort_order: categories.length + 1,
        };

        const { error: insertError } = await (supabase
          .from("quest_categories")
          .insert as any)([newCategory]);

        if (insertError) throw insertError;
      }

      resetForm();
      router.refresh();
      onCategoriesChange?.();
    } catch (err: any) {
      console.error("Error saving category:", err);
      if (err.message?.includes("duplicate key") || err.message?.includes("unique constraint")) {
        setError(
          locale === "zh-CN"
            ? "此类别名称已存在"
            : "A category with this name already exists"
        );
      } else {
        setError(
          locale === "zh-CN"
            ? `保存失败: ${err.message}`
            : `Save failed: ${err.message}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (category: QuestCategory) => {
    try {
      const { error } = await (supabase
        .from("quest_categories")
        .update as any)({ is_active: !category.is_active })
        .eq("id", category.id);

      if (error) throw error;

      router.refresh();
      onCategoriesChange?.();
    } catch (err: any) {
      console.error("Error toggling category:", err);
      alert(
        locale === "zh-CN"
          ? "切换类别状态失败"
          : "Failed to toggle category status"
      );
    }
  };

  const handleDelete = async (category: QuestCategory) => {
    const categoryName =
      locale === "zh-CN" ? category.name_zh || category.name_en : category.name_en;

    const confirmMessage =
      locale === "zh-CN"
        ? `确定要删除类别 "${categoryName}" 吗？使用此类别的任务将变为无类别。`
        : `Are you sure you want to delete "${categoryName}"? Quests using this category will become uncategorized.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("quest_categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      router.refresh();
      onCategoriesChange?.();
    } catch (err: any) {
      console.error("Error deleting category:", err);
      alert(locale === "zh-CN" ? "删除类别失败" : "Failed to delete category");
    }
  };

  const getCategoryName = (category: QuestCategory) => {
    return locale === "zh-CN"
      ? category.name_zh || category.name_en
      : category.name_en;
  };

  // Sort categories by sort_order
  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">
            {locale === "zh-CN" ? "类别管理" : "Category Management"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {locale === "zh-CN"
              ? "自定义任务类别，方便组织和筛选任务"
              : "Customize quest categories to organize and filter quests"}
          </p>
        </div>
        {!showAddForm && !editingCategory && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
          >
            <span>+</span>
            <span>{locale === "zh-CN" ? "添加类别" : "Add Category"}</span>
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingCategory) && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-semibold mb-4">
            {editingCategory
              ? locale === "zh-CN"
                ? "编辑类别"
                : "Edit Category"
              : locale === "zh-CN"
              ? "添加新类别"
              : "Add New Category"}
          </h3>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-4 gap-4">
            {/* Icon */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {locale === "zh-CN" ? "图标" : "Icon"}
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-2xl text-center"
                maxLength={4}
                placeholder="📦"
              />
            </div>

            {/* English Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {locale === "zh-CN" ? "英文名称" : "English Name"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Health"
                required
              />
            </div>

            {/* Chinese Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {locale === "zh-CN" ? "中文名称" : "Chinese Name"}
              </label>
              <input
                type="text"
                value={formData.name_zh}
                onChange={(e) => setFormData({ ...formData, name_zh: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="例如：健康"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading
                  ? locale === "zh-CN"
                    ? "保存中..."
                    : "Saving..."
                  : locale === "zh-CN"
                  ? "保存"
                  : "Save"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                disabled={loading}
              >
                {locale === "zh-CN" ? "取消" : "Cancel"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        {sortedCategories.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {locale === "zh-CN" ? "暂无类别" : "No categories yet"}
          </p>
        ) : (
          sortedCategories.map((category) => (
            <div
              key={category.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                category.is_active
                  ? "bg-white border-gray-200"
                  : "bg-gray-50 border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <div className="font-medium">{getCategoryName(category)}</div>
                  <div className="text-xs text-gray-500">
                    {locale === "zh-CN" ? "键名" : "Key"}: {category.name}
                  </div>
                </div>
                {!category.is_active && (
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                    {locale === "zh-CN" ? "已禁用" : "Disabled"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Active */}
                <button
                  onClick={() => handleToggleActive(category)}
                  className={`px-3 py-1 rounded text-sm transition ${
                    category.is_active
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                  title={category.is_active ? "Disable" : "Enable"}
                >
                  {category.is_active
                    ? locale === "zh-CN"
                      ? "禁用"
                      : "Disable"
                    : locale === "zh-CN"
                    ? "启用"
                    : "Enable"}
                </button>

                {/* Edit */}
                <button
                  onClick={() => handleEdit(category)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition"
                >
                  {locale === "zh-CN" ? "编辑" : "Edit"}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(category)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition"
                >
                  {locale === "zh-CN" ? "删除" : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        {locale === "zh-CN" ? (
          <>
            <strong>提示：</strong>删除类别不会删除使用该类别的任务，但这些任务将变为无类别状态。
          </>
        ) : (
          <>
            <strong>Note:</strong> Deleting a category won&apos;t delete quests using it, but those quests will become uncategorized.
          </>
        )}
      </div>
    </div>
  );
}
