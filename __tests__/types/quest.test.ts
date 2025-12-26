/**
 * Quest Type System Tests
 * Tests for the new quest classification system (type, scope, category)
 */

import {
  groupQuests,
  getChildVisibleQuests,
  getSuggestedStars,
  categoryLabels,
  typeLabels,
  scopeLabels,
} from "@/types/quest";
import type { Quest } from "@/types/quest";

// Mock quest data
const mockQuests: Quest[] = [
  // Duties
  {
    id: "1",
    family_id: "fam1",
    name_en: "Brush teeth",
    name_zh: "刷牙",
    stars: -5,
    type: "duty",
    scope: "self",
    category: "hygiene",
    icon: "🪥",
    is_positive: false,
    is_active: true,
    max_per_day: 2,
    sort_order: 1,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    family_id: "fam1",
    name_en: "Finish homework",
    name_zh: "完成作业",
    stars: -15,
    type: "duty",
    scope: "self",
    category: "learning",
    icon: "📝",
    is_positive: false,
    is_active: true,
    max_per_day: 1,
    sort_order: 2,
    created_at: "2025-01-01T00:00:00Z",
  },
  // Bonus - Family
  {
    id: "3",
    family_id: "fam1",
    name_en: "Help wash dishes",
    name_zh: "帮忙洗碗",
    stars: 15,
    type: "bonus",
    scope: "family",
    category: "chores",
    icon: "🍳",
    is_positive: true,
    is_active: true,
    max_per_day: 2,
    sort_order: 3,
    created_at: "2025-01-01T00:00:00Z",
  },
  // Bonus - Self
  {
    id: "4",
    family_id: "fam1",
    name_en: "Extra reading",
    name_zh: "额外阅读",
    stars: 15,
    type: "bonus",
    scope: "self",
    category: "learning",
    icon: "📖",
    is_positive: true,
    is_active: true,
    max_per_day: 2,
    sort_order: 4,
    created_at: "2025-01-01T00:00:00Z",
  },
  // Bonus - Other
  {
    id: "5",
    family_id: "fam1",
    name_en: "Help classmates",
    name_zh: "帮助同学",
    stars: 20,
    type: "bonus",
    scope: "other",
    category: "social",
    icon: "👫",
    is_positive: true,
    is_active: true,
    max_per_day: 3,
    sort_order: 5,
    created_at: "2025-01-01T00:00:00Z",
  },
  // Violation
  {
    id: "6",
    family_id: "fam1",
    name_en: "Lying",
    name_zh: "说谎",
    stars: -30,
    type: "violation",
    scope: "self",
    category: "social",
    icon: "🤥",
    is_positive: false,
    is_active: true,
    max_per_day: 99,
    sort_order: 6,
    created_at: "2025-01-01T00:00:00Z",
  },
];

describe("Quest Type System", () => {
  describe("groupQuests", () => {
    it("should group quests by type and scope correctly", () => {
      const groups = groupQuests(mockQuests);

      // Should have 5 groups (duties, family, self, others, violations)
      expect(groups.length).toBe(5);

      // Check duties group
      const dutiesGroup = groups.find((g) => g.key === "duties");
      expect(dutiesGroup).toBeDefined();
      expect(dutiesGroup!.quests.length).toBe(2);
      expect(dutiesGroup!.title_en).toBe("My Duties");
      expect(dutiesGroup!.title_zh).toBe("日常本分");
      expect(dutiesGroup!.icon).toBe("📋");

      // Check family bonus group
      const familyGroup = groups.find((g) => g.key === "family");
      expect(familyGroup).toBeDefined();
      expect(familyGroup!.quests.length).toBe(1);
      expect(familyGroup!.quests[0].scope).toBe("family");

      // Check self bonus group
      const selfGroup = groups.find((g) => g.key === "self");
      expect(selfGroup).toBeDefined();
      expect(selfGroup!.quests.length).toBe(1);
      expect(selfGroup!.quests[0].scope).toBe("self");

      // Check others bonus group
      const othersGroup = groups.find((g) => g.key === "others");
      expect(othersGroup).toBeDefined();
      expect(othersGroup!.quests.length).toBe(1);
      expect(othersGroup!.quests[0].scope).toBe("other");

      // Check violations group
      const violationsGroup = groups.find((g) => g.key === "violations");
      expect(violationsGroup).toBeDefined();
      expect(violationsGroup!.quests.length).toBe(1);
      expect(violationsGroup!.quests[0].type).toBe("violation");
    });

    it("should filter out empty groups", () => {
      const bonusOnly = mockQuests.filter((q) => q.type === "bonus");
      const groups = groupQuests(bonusOnly);

      // Should only have 3 groups (family, self, others)
      expect(groups.length).toBe(3);
      expect(groups.every((g) => g.quests.length > 0)).toBe(true);
    });
  });

  describe("getChildVisibleQuests", () => {
    it("should only return bonus quests", () => {
      const visibleQuests = getChildVisibleQuests(mockQuests);

      expect(visibleQuests.length).toBe(3);
      expect(visibleQuests.every((q) => q.type === "bonus")).toBe(true);
    });

    it("should only return active quests", () => {
      const questsWithInactive = [
        ...mockQuests,
        {
          ...mockQuests[2],
          id: "7",
          is_active: false,
        },
      ];

      const visibleQuests = getChildVisibleQuests(questsWithInactive);

      expect(visibleQuests.every((q) => q.is_active)).toBe(true);
    });

    it("should exclude duties and violations", () => {
      const visibleQuests = getChildVisibleQuests(mockQuests);

      expect(visibleQuests.some((q) => q.type === "duty")).toBe(false);
      expect(visibleQuests.some((q) => q.type === "violation")).toBe(false);
    });
  });

  describe("getSuggestedStars", () => {
    it("should suggest correct range for duty tasks", () => {
      const hygieneRange = getSuggestedStars("duty", undefined, "hygiene");
      expect(hygieneRange.min).toBe(-10);
      expect(hygieneRange.max).toBe(-3);
      expect(hygieneRange.default).toBe(-5);

      const choresRange = getSuggestedStars("duty", undefined, "chores");
      expect(choresRange.default).toBe(-10);

      const learningRange = getSuggestedStars("duty", undefined, "learning");
      expect(learningRange.default).toBe(-15);
    });

    it("should suggest correct range for bonus tasks", () => {
      const selfRange = getSuggestedStars("bonus", "self");
      expect(selfRange.min).toBe(5);
      expect(selfRange.max).toBe(30);
      expect(selfRange.default).toBe(15);

      const familyRange = getSuggestedStars("bonus", "family");
      expect(familyRange.default).toBe(15);

      const otherRange = getSuggestedStars("bonus", "other");
      expect(otherRange.default).toBe(20);
    });

    it("should suggest correct range for violations", () => {
      const violationRange = getSuggestedStars("violation");
      expect(violationRange.min).toBe(-50);
      expect(violationRange.max).toBe(-10);
      expect(violationRange.default).toBe(-30);
    });
  });

  describe("Label definitions", () => {
    it("should have labels for all categories", () => {
      expect(categoryLabels.chores).toBeDefined();
      expect(categoryLabels.hygiene).toBeDefined();
      expect(categoryLabels.learning).toBeDefined();
      expect(categoryLabels.health).toBeDefined();
      expect(categoryLabels.social).toBeDefined();
      expect(categoryLabels.other).toBeDefined();

      // Check bilingual labels
      expect(categoryLabels.hygiene.en).toBe("Hygiene");
      expect(categoryLabels.hygiene.zh).toBe("卫生");
      expect(categoryLabels.social.en).toBe("Social");
      expect(categoryLabels.social.zh).toBe("社交");
    });

    it("should have labels for all types", () => {
      expect(typeLabels.duty).toBeDefined();
      expect(typeLabels.bonus).toBeDefined();
      expect(typeLabels.violation).toBeDefined();

      // Check descriptions
      expect(typeLabels.duty.description_en).toContain("Should do");
      expect(typeLabels.bonus.description_en).toContain("Extra effort");
      expect(typeLabels.violation.description_en).toContain("Bad behavior");
    });

    it("should have labels for all scopes", () => {
      expect(scopeLabels.self).toBeDefined();
      expect(scopeLabels.family).toBeDefined();
      expect(scopeLabels.other).toBeDefined();

      // Check icons
      expect(scopeLabels.self.icon).toBe("👤");
      expect(scopeLabels.family.icon).toBe("👨‍👩‍👧");
      expect(scopeLabels.other.icon).toBe("🌍");
    });
  });

  describe("Quest classification logic", () => {
    it("should correctly identify quest types by stars", () => {
      const duties = mockQuests.filter((q) => q.type === "duty");
      expect(duties.every((q) => q.stars < 0)).toBe(true);

      const bonuses = mockQuests.filter((q) => q.type === "bonus");
      expect(bonuses.every((q) => q.stars > 0)).toBe(true);

      const violations = mockQuests.filter((q) => q.type === "violation");
      expect(violations.every((q) => q.stars < 0)).toBe(true);
    });

    it("should have correct scope assignments", () => {
      const duties = mockQuests.filter((q) => q.type === "duty");
      expect(duties.every((q) => q.scope === "self")).toBe(true);

      const familyBonus = mockQuests.find(
        (q) => q.type === "bonus" && q.scope === "family"
      );
      expect(familyBonus).toBeDefined();
      expect(familyBonus!.name_en).toContain("Help");

      const otherBonus = mockQuests.find(
        (q) => q.type === "bonus" && q.scope === "other"
      );
      expect(otherBonus).toBeDefined();
      expect(otherBonus!.name_en).toContain("classmates");
    });
  });
});
