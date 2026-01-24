// types/category.ts
// Quest category type definitions

/**
 * Represents a configurable quest category from the database.
 * Each family can have their own set of categories.
 */
export interface QuestCategory {
  id: string;
  family_id: string;
  name: string;          // Internal key (lowercase, no spaces)
  name_en: string;       // English display name
  name_zh: string | null; // Chinese display name (optional)
  icon: string;          // Emoji icon
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

/**
 * Type for inserting a new category
 */
export interface QuestCategoryInsert {
  family_id: string;
  name: string;
  name_en: string;
  name_zh?: string | null;
  icon?: string;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Type for updating an existing category
 */
export interface QuestCategoryUpdate {
  name?: string;
  name_en?: string;
  name_zh?: string | null;
  icon?: string;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Default categories that are seeded for new families.
 * This matches the data in the database migration.
 */
export const DEFAULT_CATEGORIES: Omit<QuestCategoryInsert, 'family_id'>[] = [
  { name: 'health', name_en: 'Health', name_zh: '健康', icon: '💪', sort_order: 1 },
  { name: 'study', name_en: 'Study', name_zh: '学业', icon: '✍️', sort_order: 2 },
  { name: 'chores', name_en: 'Chores', name_zh: '家务', icon: '🧹', sort_order: 3 },
  { name: 'hygiene', name_en: 'Hygiene', name_zh: '卫生', icon: '🧼', sort_order: 4 },
  { name: 'learning', name_en: 'Learning', name_zh: '学习', icon: '📚', sort_order: 5 },
  { name: 'social', name_en: 'Social', name_zh: '社交', icon: '🤝', sort_order: 6 },
  { name: 'creativity', name_en: 'Creativity', name_zh: '创造力', icon: '🎨', sort_order: 7 },
  { name: 'exercise', name_en: 'Exercise', name_zh: '运动', icon: '🏃', sort_order: 8 },
  { name: 'reading', name_en: 'Reading', name_zh: '阅读', icon: '📖', sort_order: 9 },
  { name: 'music', name_en: 'Music', name_zh: '音乐', icon: '🎵', sort_order: 10 },
  { name: 'art', name_en: 'Art', name_zh: '艺术', icon: '🖼️', sort_order: 11 },
  { name: 'kindness', name_en: 'Kindness', name_zh: '善良', icon: '❤️', sort_order: 12 },
  { name: 'responsibility', name_en: 'Responsibility', name_zh: '责任', icon: '🎯', sort_order: 13 },
  { name: 'other', name_en: 'Other', name_zh: '其他', icon: '📦', sort_order: 99 },
];

/**
 * Helper function to get the display name based on locale
 */
export function getCategoryDisplayName(
  category: QuestCategory,
  locale: string
): string {
  if (locale === 'zh-CN' && category.name_zh) {
    return category.name_zh;
  }
  return category.name_en;
}

/**
 * Helper function to format category for display with icon
 */
export function formatCategoryWithIcon(
  category: QuestCategory,
  locale: string
): string {
  const name = getCategoryDisplayName(category, locale);
  return `${category.icon} ${name}`;
}
