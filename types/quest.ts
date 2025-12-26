// types/quest.ts
// Quest type definitions and utility functions

import { Database } from "./database";

export type QuestType = "duty" | "bonus" | "violation";
export type QuestScope = "self" | "family" | "other";
export type QuestCategory =
  | "health"
  | "study"
  | "chores"
  | "hygiene"
  | "learning"
  | "social"
  | "creativity"
  | "exercise"
  | "reading"
  | "music"
  | "art"
  | "kindness"
  | "responsibility"
  | "other";

export type Quest = Database["public"]["Tables"]["quests"]["Row"];
export type QuestInsert = Database["public"]["Tables"]["quests"]["Insert"];
export type QuestUpdate = Database["public"]["Tables"]["quests"]["Update"];

// Quest group for UI display
export interface QuestGroup {
  key: string;
  title_en: string;
  title_zh: string;
  icon: string;
  quests: Quest[];
}

// Group quests by type and scope for parent UI
export const groupQuests = (quests: Quest[]): QuestGroup[] => {
  return [
    {
      key: "duties",
      title_en: "My Duties",
      title_zh: "日常本分",
      icon: "📋",
      quests: quests.filter((q) => q.type === "duty"),
    },
    {
      key: "family",
      title_en: "Helping Family",
      title_zh: "帮助家人",
      icon: "👨‍👩‍👧",
      quests: quests.filter((q) => q.type === "bonus" && q.scope === "family"),
    },
    {
      key: "self",
      title_en: "Self Bonus",
      title_zh: "自我提升",
      icon: "⭐",
      quests: quests.filter((q) => q.type === "bonus" && q.scope === "self"),
    },
    {
      key: "others",
      title_en: "Helping Others",
      title_zh: "帮助他人",
      icon: "🌍",
      quests: quests.filter((q) => q.type === "bonus" && q.scope === "other"),
    },
    {
      key: "violations",
      title_en: "Violations",
      title_zh: "违规行为",
      icon: "⚠️",
      quests: quests.filter((q) => q.type === "violation"),
    },
  ].filter((group) => group.quests.length > 0); // Only return groups with quests
};

// Get only bonus quests for child UI (children should not see duties or violations)
export const getChildVisibleQuests = (quests: Quest[]): Quest[] => {
  return quests.filter((q) => q.type === "bonus" && q.is_active);
};

// Group quests by category within a type
export const groupQuestsByCategory = (
  quests: Quest[]
): Record<string, Quest[]> => {
  return quests.reduce(
    (acc, quest) => {
      const category = quest.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(quest);
      return acc;
    },
    {} as Record<string, Quest[]>
  );
};

// Get suggested star value based on quest type and category
export const getSuggestedStars = (
  type: QuestType,
  scope?: QuestScope,
  category?: QuestCategory
): { min: number; max: number; default: number } => {
  if (type === "duty") {
    if (category === "hygiene") return { min: -10, max: -3, default: -5 };
    if (category === "chores") return { min: -15, max: -5, default: -10 };
    if (category === "learning") return { min: -20, max: -10, default: -15 };
    return { min: -15, max: -5, default: -10 };
  }

  if (type === "bonus") {
    if (scope === "self") return { min: 5, max: 30, default: 15 };
    if (scope === "family") return { min: 10, max: 25, default: 15 };
    if (scope === "other") return { min: 10, max: 25, default: 20 };
    return { min: 5, max: 30, default: 15 };
  }

  if (type === "violation") {
    // Minor violations vs major violations
    return { min: -50, max: -10, default: -30 };
  }

  return { min: -50, max: 50, default: 0 };
};

// Category labels
export const categoryLabels: Record<
  QuestCategory,
  { en: string; zh: string; icon: string }
> = {
  health: { en: "Health", zh: "健康", icon: "💪" },
  study: { en: "Study", zh: "学业", icon: "✍️" },
  chores: { en: "Chores", zh: "家务", icon: "🧹" },
  hygiene: { en: "Hygiene", zh: "卫生", icon: "🧼" },
  learning: { en: "Learning", zh: "学习", icon: "📚" },
  social: { en: "Social", zh: "社交", icon: "🤝" },
  creativity: { en: "Creativity", zh: "创造力", icon: "🎨" },
  exercise: { en: "Exercise", zh: "运动", icon: "🏃" },
  reading: { en: "Reading", zh: "阅读", icon: "📖" },
  music: { en: "Music", zh: "音乐", icon: "🎵" },
  art: { en: "Art", zh: "艺术", icon: "🖼️" },
  kindness: { en: "Kindness", zh: "善良", icon: "❤️" },
  responsibility: { en: "Responsibility", zh: "责任", icon: "🎯" },
  other: { en: "Other", zh: "其他", icon: "📦" },
};

// Type labels
export const typeLabels: Record<
  QuestType,
  { en: string; zh: string; icon: string; description_en: string; description_zh: string }
> = {
  duty: {
    en: "Daily Duty",
    zh: "日常本分",
    icon: "📋",
    description_en: "Should do, miss = deduct",
    description_zh: "应该做的事，没做 = 扣分",
  },
  bonus: {
    en: "Bonus Quest",
    zh: "加分任务",
    icon: "⭐",
    description_en: "Extra effort = earn stars",
    description_zh: "额外表现 = 加分",
  },
  violation: {
    en: "Violation",
    zh: "违规行为",
    icon: "⚠️",
    description_en: "Bad behavior = deduct",
    description_zh: "严重错误 = 扣分",
  },
};

// Scope labels
export const scopeLabels: Record<
  QuestScope,
  { en: string; zh: string; icon: string; description_en: string; description_zh: string }
> = {
  self: {
    en: "Self",
    zh: "自己",
    icon: "👤",
    description_en: "For oneself / self-improvement",
    description_zh: "自己该做的事 / 自我提升",
  },
  family: {
    en: "Family",
    zh: "家人",
    icon: "👨‍👩‍👧",
    description_en: "Help parents or siblings",
    description_zh: "帮助家人做事",
  },
  other: {
    en: "Others",
    zh: "他人",
    icon: "🌍",
    description_en: "Help classmates, neighbors, etc.",
    description_zh: "帮助家庭以外的人",
  },
};
