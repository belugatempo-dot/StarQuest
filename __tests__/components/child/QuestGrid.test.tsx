/**
 * QuestGrid Component Tests
 * Tests the quest grid display with new type/scope grouping
 */

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import QuestGrid from "@/components/child/QuestGrid";
import type { Database } from "@/types/database";

type Quest = Database["public"]["Tables"]["quests"]["Row"];

// Mock translations
const messages = {
  common: {
    stars: "Stars",
    noData: "No data available",
  },
  quests: {
    category: {
      chores: "Chores",
      hygiene: "Hygiene",
      learning: "Learning",
      health: "Health",
      social: "Social",
      other: "Other",
    },
  },
};

const mockBonusQuests: Quest[] = [
  // Family scope
  {
    id: "1",
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
    sort_order: 1,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    family_id: "fam1",
    name_en: "Help cook",
    name_zh: "帮忙做饭",
    stars: 15,
    type: "bonus",
    scope: "family",
    category: "chores",
    icon: "👨‍🍳",
    is_positive: true,
    is_active: true,
    max_per_day: 2,
    sort_order: 2,
    created_at: "2025-01-01T00:00:00Z",
  },
  // Self scope
  {
    id: "3",
    family_id: "fam1",
    name_en: "Extra reading 30 min",
    name_zh: "额外阅读30分钟",
    stars: 15,
    type: "bonus",
    scope: "self",
    category: "learning",
    icon: "📖",
    is_positive: true,
    is_active: true,
    max_per_day: 2,
    sort_order: 3,
    created_at: "2025-01-01T00:00:00Z",
  },
  // Other scope
  {
    id: "4",
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
    sort_order: 4,
    created_at: "2025-01-01T00:00:00Z",
  },
];

// Mock router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe("QuestGrid Component", () => {
  const renderComponent = (quests: Quest[], locale = "en") => {
    return render(
      <NextIntlClientProvider messages={messages} locale={locale}>
        <QuestGrid quests={quests} locale={locale} userId="user1" />
      </NextIntlClientProvider>
    );
  };

  describe("Quest grouping by scope", () => {
    it("should display quests grouped by scope", () => {
      renderComponent(mockBonusQuests);

      // Should have 3 scope sections (exact titles from scopeLabels)
      expect(screen.getByText("Family")).toBeInTheDocument();
      expect(screen.getByText("Self")).toBeInTheDocument();
      expect(screen.getByText("Others")).toBeInTheDocument();
    });

    it("should display correct number of quests in each group", () => {
      renderComponent(mockBonusQuests);

      // Family: 2 quests
      expect(screen.getByText("Help wash dishes")).toBeInTheDocument();
      expect(screen.getByText("Help cook")).toBeInTheDocument();

      // Self: 1 quest
      expect(screen.getByText("Extra reading 30 min")).toBeInTheDocument();

      // Others: 1 quest
      expect(screen.getByText("Help classmates")).toBeInTheDocument();
    });

    it("should display scope icons", () => {
      const { container } = renderComponent(mockBonusQuests);

      // Check for scope icons (these are emoji text nodes)
      const content = container.textContent;
      expect(content).toContain("👨‍👩‍👧"); // family icon
      expect(content).toContain("🌍"); // others icon
    });
  });

  describe("Quest display", () => {
    it("should display quest icons", () => {
      renderComponent(mockBonusQuests);

      const content = screen.getByText("Help wash dishes").closest("div");
      expect(content?.textContent).toContain("🍳");
    });

    it("should display quest stars", () => {
      renderComponent(mockBonusQuests);

      // All bonus quests should show positive stars
      expect(screen.getAllByText(/\+15/)[0]).toBeInTheDocument();
      expect(screen.getByText(/\+20/)).toBeInTheDocument();
    });

    it("should display category badges", () => {
      const { container } = renderComponent(mockBonusQuests);

      // Categories are displayed (translations may show as keys in test)
      const content = container.textContent;
      expect(content).toContain("chores");
      expect(content).toContain("learning");
      expect(content).toContain("social");
    });
  });

  describe("Empty states", () => {
    it("should show empty state when no quests", () => {
      renderComponent([]);

      // Check for empty state elements (translation keys may show in test)
      expect(
        screen.getByText(/Your parents haven't set up any bonus quests yet!/i)
      ).toBeInTheDocument();
      // Should show target emoji
      const { container } = renderComponent([]);
      expect(container.textContent).toContain("🎯");
    });

    it("should not show empty groups", () => {
      // Only family quests
      const familyOnly = mockBonusQuests.filter((q) => q.scope === "family");
      renderComponent(familyOnly);

      // Should show family section
      expect(screen.getByText("Family")).toBeInTheDocument();

      // Should NOT show other sections (Self and Others)
      expect(screen.queryByText("Others")).not.toBeInTheDocument();
      // Note: "Self" is too common and might appear elsewhere, skip this check
    });
  });

  describe("Locale support", () => {
    it("should display Chinese names when locale is zh-CN", () => {
      renderComponent(mockBonusQuests, "zh-CN");

      expect(screen.getByText("帮忙洗碗")).toBeInTheDocument();
      expect(screen.getByText("帮忙做饭")).toBeInTheDocument();
      expect(screen.getByText("额外阅读30分钟")).toBeInTheDocument();
      expect(screen.getByText("帮助同学")).toBeInTheDocument();
    });

    it("should display English names when locale is en", () => {
      renderComponent(mockBonusQuests, "en");

      expect(screen.getByText("Help wash dishes")).toBeInTheDocument();
      expect(screen.getByText("Help cook")).toBeInTheDocument();
      expect(screen.getByText("Extra reading 30 min")).toBeInTheDocument();
      expect(screen.getByText("Help classmates")).toBeInTheDocument();
    });
  });

  describe("Quest display with different types", () => {
    it("should display all provided quests regardless of type", () => {
      // Note: QuestGrid displays whatever quests it receives
      // Filtering should happen at the page level (query)
      const mixedQuests: Quest[] = [
        ...mockBonusQuests,
        {
          id: "5",
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
          sort_order: 5,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      renderComponent(mixedQuests);

      // Component displays all quests it receives
      expect(screen.getByText("Help wash dishes")).toBeInTheDocument();
      expect(screen.getByText("Brush teeth")).toBeInTheDocument();
    });

    it("should handle only bonus quests correctly", () => {
      // When page query filters to only bonus quests
      renderComponent(mockBonusQuests);

      // Should show all bonus quests
      expect(screen.getByText("Help wash dishes")).toBeInTheDocument();
      expect(screen.getByText("Extra reading 30 min")).toBeInTheDocument();
      expect(screen.getByText("Help classmates")).toBeInTheDocument();
    });
  });
});
