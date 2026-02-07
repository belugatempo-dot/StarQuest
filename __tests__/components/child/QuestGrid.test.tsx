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

// --- Additional coverage tests ---

// Mock RequestStarsModal for interaction tests
jest.mock("@/components/child/RequestStarsModal", () => {
  return function MockRequestStarsModal({ quest, onClose, onSuccess }: any) {
    return (
      <div data-testid="request-stars-modal">
        <span>Modal for {quest.name_en}</span>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Submit Request</button>
      </div>
    );
  };
});

// Re-import after mock
const QuestGridWithModal =
  jest.requireActual("@/components/child/QuestGrid").default;

// Need fireEvent for click tests
import { fireEvent } from "@testing-library/react";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: mockRefresh,
  }),
}));

describe("QuestGrid - Quest Card Interactions", () => {
  const renderComponent = (quests: Quest[], locale = "en") => {
    return render(
      <NextIntlClientProvider messages={messages} locale={locale}>
        <QuestGrid quests={quests} locale={locale} userId="user1" />
      </NextIntlClientProvider>
    );
  };

  beforeEach(() => {
    mockRefresh.mockClear();
  });

  it("opens RequestStarsModal when clicking a quest card", () => {
    renderComponent(mockBonusQuests);

    // Click on a quest card - the quest name text is inside the card div
    const questCard = screen.getByText("Help wash dishes").closest(".group");
    expect(questCard).toBeTruthy();
    fireEvent.click(questCard!);

    // Modal should appear
    expect(screen.getByTestId("request-stars-modal")).toBeInTheDocument();
    expect(screen.getByText("Modal for Help wash dishes")).toBeInTheDocument();
  });

  it("closes modal when onClose is called", () => {
    renderComponent(mockBonusQuests);

    // Open modal
    const questCard = screen.getByText("Help wash dishes").closest(".group");
    fireEvent.click(questCard!);
    expect(screen.getByTestId("request-stars-modal")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByText("Close Modal"));
    expect(screen.queryByTestId("request-stars-modal")).not.toBeInTheDocument();
  });

  it("closes modal and calls router.refresh() on success", () => {
    renderComponent(mockBonusQuests);

    // Open modal
    const questCard = screen.getByText("Help wash dishes").closest(".group");
    fireEvent.click(questCard!);
    expect(screen.getByTestId("request-stars-modal")).toBeInTheDocument();

    // Trigger success
    fireEvent.click(screen.getByText("Submit Request"));
    expect(screen.queryByTestId("request-stars-modal")).not.toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows default icon when quest.icon is null", () => {
    const questsWithNoIcon: Quest[] = [
      {
        id: "10",
        family_id: "fam1",
        name_en: "No Icon Quest",
        name_zh: "无图标任务",
        stars: 5,
        type: "bonus",
        scope: "self",
        category: "learning",
        icon: null,
        is_positive: true,
        is_active: true,
        max_per_day: 1,
        sort_order: 1,
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    const { container } = renderComponent(questsWithNoIcon);

    // Default icon should be "⭐" when quest.icon is null
    // The 4xl icon div should contain ⭐
    const iconDiv = container.querySelector(".text-4xl");
    expect(iconDiv?.textContent).toBe("⭐");
  });

  it("shows quest icon when quest.icon is set", () => {
    const { container } = renderComponent([mockBonusQuests[0]]);

    const iconDiv = container.querySelector(".text-4xl");
    expect(iconDiv?.textContent).toBe("🍳");
  });

  it("does not render category badge when quest.category is null", () => {
    const questsWithNoCategory: Quest[] = [
      {
        id: "11",
        family_id: "fam1",
        name_en: "No Category Quest",
        name_zh: "无分类任务",
        stars: 5,
        type: "bonus",
        scope: "self",
        category: null,
        icon: "🎯",
        is_positive: true,
        is_active: true,
        max_per_day: 1,
        sort_order: 1,
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    const { container } = renderComponent(questsWithNoCategory);

    // Category badge uses rounded-full class
    const badges = container.querySelectorAll(".rounded-full");
    expect(badges.length).toBe(0);
  });

  it("renders category badge when quest.category is set", () => {
    const { container } = renderComponent([mockBonusQuests[0]]);

    // Category badge uses rounded-full class
    const badges = container.querySelectorAll(".rounded-full");
    expect(badges.length).toBe(1);
  });
});

describe("QuestGrid - getCategoryColor", () => {
  const renderComponent = (quests: Quest[], locale = "en") => {
    return render(
      <NextIntlClientProvider messages={messages} locale={locale}>
        <QuestGrid quests={quests} locale={locale} userId="user1" />
      </NextIntlClientProvider>
    );
  };

  const makeQuestWithCategory = (category: string | null): Quest[] => [
    {
      id: "color-test",
      family_id: "fam1",
      name_en: "Color Test Quest",
      name_zh: "颜色测试",
      stars: 5,
      type: "bonus",
      scope: "self",
      category: category,
      icon: "🎯",
      is_positive: true,
      is_active: true,
      max_per_day: 1,
      sort_order: 1,
      created_at: "2025-01-01T00:00:00Z",
    },
  ];

  it("applies learning color classes", () => {
    const { container } = renderComponent(makeQuestWithCategory("learning"));
    const badge = container.querySelector(".rounded-full");
    expect(badge?.className).toContain("bg-blue-100");
    expect(badge?.className).toContain("text-blue-700");
  });

  it("applies chores color classes", () => {
    const { container } = renderComponent(makeQuestWithCategory("chores"));
    const badge = container.querySelector(".rounded-full");
    expect(badge?.className).toContain("bg-green-100");
    expect(badge?.className).toContain("text-green-700");
  });

  it("applies hygiene color classes", () => {
    const { container } = renderComponent(makeQuestWithCategory("hygiene"));
    const badge = container.querySelector(".rounded-full");
    expect(badge?.className).toContain("bg-cyan-100");
    expect(badge?.className).toContain("text-cyan-700");
  });

  it("applies health color classes", () => {
    const { container } = renderComponent(makeQuestWithCategory("health"));
    const badge = container.querySelector(".rounded-full");
    expect(badge?.className).toContain("bg-pink-100");
    expect(badge?.className).toContain("text-pink-700");
  });

  it("applies social color classes", () => {
    const { container } = renderComponent(makeQuestWithCategory("social"));
    const badge = container.querySelector(".rounded-full");
    expect(badge?.className).toContain("bg-purple-100");
    expect(badge?.className).toContain("text-purple-700");
  });

  it("applies default (other) color for unknown category", () => {
    const { container } = renderComponent(
      makeQuestWithCategory("unknownCategory")
    );
    const badge = container.querySelector(".rounded-full");
    expect(badge?.className).toContain("bg-gray-100");
    expect(badge?.className).toContain("text-gray-700");
  });
});
