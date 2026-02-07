import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LevelManagement from "@/components/admin/LevelManagement";
import type { Database } from "@/types/database";

type Level = Database["public"]["Tables"]["levels"]["Row"];

// Mock next/navigation
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock LevelFormModal
jest.mock("@/components/admin/LevelFormModal", () => {
  return function MockLevelFormModal({ level, onClose, onSuccess }: any) {
    return (
      <div data-testid="level-form-modal">
        <p>Editing Level {level.level_number}</p>
        <p>{level.name_en}</p>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Success</button>
      </div>
    );
  };
});

describe("LevelManagement", () => {
  const mockLevels: Level[] = [
    {
      id: "level-1",
      family_id: "family-123",
      level_number: 1,
      name_en: "Starter",
      name_zh: "新手",
      stars_required: 0,
      icon: "🌱",
      created_at: "2025-01-01",
    },
    {
      id: "level-2",
      family_id: "family-123",
      level_number: 2,
      name_en: "Explorer",
      name_zh: "探索者",
      stars_required: 50,
      icon: "🔍",
      created_at: "2025-01-01",
    },
    {
      id: "level-3",
      family_id: "family-123",
      level_number: 3,
      name_en: "Adventurer",
      name_zh: "冒险家",
      stars_required: 150,
      icon: "🎒",
      created_at: "2025-01-01",
    },
    {
      id: "level-4",
      family_id: "family-123",
      level_number: 4,
      name_en: "Champion",
      name_zh: "勇士",
      stars_required: 300,
      icon: "⚔️",
      created_at: "2025-01-01",
    },
    {
      id: "level-5",
      family_id: "family-123",
      level_number: 5,
      name_en: "Hero",
      name_zh: "英雄",
      stars_required: 500,
      icon: "🦸",
      created_at: "2025-01-01",
    },
    {
      id: "level-6",
      family_id: "family-123",
      level_number: 6,
      name_en: "Legend",
      name_zh: "传奇",
      stars_required: 1000,
      icon: "👑",
      created_at: "2025-01-01",
    },
    {
      id: "level-7",
      family_id: "family-123",
      level_number: 7,
      name_en: "Star Master",
      name_zh: "星星大师",
      stars_required: 2000,
      icon: "⭐",
      created_at: "2025-01-01",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render info card about level system", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      expect(screen.getByText("💡")).toBeInTheDocument();
      expect(screen.getByText("About Level System")).toBeInTheDocument();
      expect(
        screen.getByText(/Levels are based on total lifetime positive stars/)
      ).toBeInTheDocument();
    });

    it("should render info card in Chinese when locale is zh-CN", () => {
      render(<LevelManagement levels={mockLevels} locale="zh-CN" />);

      expect(screen.getByText("关于等级系统")).toBeInTheDocument();
    });

    it("should display all 7 levels", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Explorer")).toBeInTheDocument();
      expect(screen.getByText("Adventurer")).toBeInTheDocument();
      expect(screen.getByText("Champion")).toBeInTheDocument();
      expect(screen.getByText("Hero")).toBeInTheDocument();
      expect(screen.getByText("Legend")).toBeInTheDocument();
      expect(screen.getByText("Star Master")).toBeInTheDocument();
    });

    it("should display Chinese level names when locale is zh-CN", () => {
      render(<LevelManagement levels={mockLevels} locale="zh-CN" />);

      expect(screen.getByText("新手")).toBeInTheDocument();
      expect(screen.getByText("探索者")).toBeInTheDocument();
      expect(screen.getByText("冒险家")).toBeInTheDocument();
      expect(screen.getByText("勇士")).toBeInTheDocument();
      expect(screen.getByText("英雄")).toBeInTheDocument();
      expect(screen.getByText("传奇")).toBeInTheDocument();
      expect(screen.getByText("星星大师")).toBeInTheDocument();
    });

    it("should display level icons", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      expect(screen.getByText("🌱")).toBeInTheDocument();
      expect(screen.getByText("🔍")).toBeInTheDocument();
      expect(screen.getByText("🎒")).toBeInTheDocument();
      expect(screen.getByText("⚔️")).toBeInTheDocument();
      expect(screen.getByText("🦸")).toBeInTheDocument();
      expect(screen.getByText("👑")).toBeInTheDocument();
      expect(screen.getByText("⭐")).toBeInTheDocument();
    });

    it("should display level number badges", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("should display stars required for each level", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      expect(screen.getByText("0 ⭐")).toBeInTheDocument();
      expect(screen.getByText("50 ⭐")).toBeInTheDocument();
      expect(screen.getByText("150 ⭐")).toBeInTheDocument();
      expect(screen.getByText("300 ⭐")).toBeInTheDocument();
      expect(screen.getByText("500 ⭐")).toBeInTheDocument();
      expect(screen.getByText("1,000 ⭐")).toBeInTheDocument();
      expect(screen.getByText("2,000 ⭐")).toBeInTheDocument();
    });

    it("should display gap to next level", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      // Check that "Next level:" text appears (should be 6 times)
      const nextLevelLabels = screen.getAllByText(/Next level:/);
      expect(nextLevelLabels.length).toBe(6);
    });

    it("should display edit button for each level", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      const editButtons = screen.getAllByRole("button", { name: /Edit/ });
      expect(editButtons).toHaveLength(7);
    });

    it("should display Chinese edit button text when locale is zh-CN", () => {
      render(<LevelManagement levels={mockLevels} locale="zh-CN" />);

      const editButtons = screen.getAllByRole("button", { name: /编辑/ });
      expect(editButtons).toHaveLength(7);
    });

    it("should show empty state when no levels", () => {
      render(<LevelManagement levels={[]} locale="en" />);

      expect(screen.getByText("⭐")).toBeInTheDocument();
      expect(
        screen.getByText(/No levels configured yet/)
      ).toBeInTheDocument();
    });

    it("should show empty state in Chinese when no levels and locale is zh-CN", () => {
      render(<LevelManagement levels={[]} locale="zh-CN" />);

      expect(
        screen.getByText(/还没有配置等级/)
      ).toBeInTheDocument();
    });

    it("should display fallback icon when level has no icon", () => {
      const levelsWithoutIcon = [{ ...mockLevels[0], icon: null }];
      render(<LevelManagement levels={levelsWithoutIcon} locale="en" />);

      expect(screen.getByText("⭐")).toBeInTheDocument();
    });

    it("should fallback to English name when Chinese name is null", () => {
      const levelsWithoutZh = [{ ...mockLevels[0], name_zh: null }];
      render(<LevelManagement levels={levelsWithoutZh} locale="zh-CN" />);

      expect(screen.getByText("Starter")).toBeInTheDocument();
    });
  });

  describe("Level Display Details", () => {
    it("should display 'Requires' label in English", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      const requiresLabels = screen.getAllByText(/Requires:/);
      expect(requiresLabels.length).toBeGreaterThan(0);
    });

    it("should display 'Requires' label in Chinese", () => {
      render(<LevelManagement levels={mockLevels} locale="zh-CN" />);

      const requiresLabels = screen.getAllByText(/需要:/);
      expect(requiresLabels.length).toBeGreaterThan(0);
    });

    it("should display 'Next level' label for non-final levels", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      const nextLevelLabels = screen.getAllByText(/Next level:/);
      // Should have 6 (all levels except the last)
      expect(nextLevelLabels.length).toBe(6);
    });

    it("should not display 'Next level' for the last level", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      // Star Master is the last level
      const starMasterCard = screen.getByText("Star Master").closest("div");
      const nextLevelText = starMasterCard?.textContent?.match(/Next level:/);

      // The last level should not have "Next level" text
      // We can check by counting all "Next level:" occurrences
      const allNextLevel = screen.getAllByText(/Next level:/);
      expect(allNextLevel.length).toBe(6); // Not 7
    });
  });

  describe("Modal Interaction", () => {
    it("should open edit modal when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<LevelManagement levels={mockLevels} locale="en" />);

      const editButtons = screen.getAllByRole("button", { name: /Edit/ });
      await user.click(editButtons[2]); // Click edit for level 3 (Adventurer)

      await waitFor(() => {
        expect(screen.getByTestId("level-form-modal")).toBeInTheDocument();
        expect(screen.getByText("Editing Level 3")).toBeInTheDocument();
      });
    });

    it("should close modal when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<LevelManagement levels={mockLevels} locale="en" />);

      const editButtons = screen.getAllByRole("button", { name: /Edit/ });
      await user.click(editButtons[0]);

      expect(screen.getByTestId("level-form-modal")).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: "Close Modal" });
      await user.click(closeButton);

      expect(screen.queryByTestId("level-form-modal")).not.toBeInTheDocument();
    });

    it("should close modal and refresh on success", async () => {
      const user = userEvent.setup();
      render(<LevelManagement levels={mockLevels} locale="en" />);

      const editButtons = screen.getAllByRole("button", { name: /Edit/ });
      await user.click(editButtons[0]);

      const successButton = screen.getByRole("button", { name: "Success" });
      await user.click(successButton);

      expect(screen.queryByTestId("level-form-modal")).not.toBeInTheDocument();
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("should be able to edit different levels", async () => {
      const user = userEvent.setup();
      render(<LevelManagement levels={mockLevels} locale="en" />);

      // Edit level 1
      const editButtons1 = screen.getAllByRole("button", { name: /Edit/ });
      await user.click(editButtons1[0]);

      await waitFor(() => {
        expect(screen.getByTestId("level-form-modal")).toBeInTheDocument();
        expect(screen.getByText("Editing Level 1")).toBeInTheDocument();
      });

      const closeButton1 = screen.getByRole("button", { name: "Close Modal" });
      await user.click(closeButton1);

      await waitFor(() => {
        expect(screen.queryByTestId("level-form-modal")).not.toBeInTheDocument();
      });

      // Edit level 7
      const editButtons2 = screen.getAllByRole("button", { name: /Edit/ });
      await user.click(editButtons2[6]);

      await waitFor(() => {
        expect(screen.getByTestId("level-form-modal")).toBeInTheDocument();
        expect(screen.getByText("Editing Level 7")).toBeInTheDocument();
      });
    });
  });

  describe("Number Formatting", () => {
    it("should format large numbers with commas", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      expect(screen.getByText("1,000 ⭐")).toBeInTheDocument();
      expect(screen.getByText("2,000 ⭐")).toBeInTheDocument();
    });

    it("should format gap numbers with commas", () => {
      render(<LevelManagement levels={mockLevels} locale="en" />);

      // The text will be in format "Next level: 1,000 ⭐"
      const allMatches = screen.getAllByText(/1,000/);
      expect(allMatches.length).toBeGreaterThan(0);
    });
  });

  describe("Visual Elements", () => {
    it("should apply gradient to level number badges", () => {
      const { container } = render(<LevelManagement levels={mockLevels} locale="en" />);

      const levelBadges = container.querySelectorAll(".bg-gradient-to-br");
      expect(levelBadges.length).toBeGreaterThan(0);
    });

    it("should display progress bars between levels", () => {
      const { container } = render(<LevelManagement levels={mockLevels} locale="en" />);

      const progressBars = container.querySelectorAll(".bg-gradient-to-r");
      // Should have progress bars for levels 1-6 (not for the last level)
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it("should display connectors between level cards", () => {
      const { container } = render(<LevelManagement levels={mockLevels} locale="en" />);

      const connectors = container.querySelectorAll(".bg-gradient-to-b");
      // Should have connectors for levels 1-6 (not after the last level)
      expect(connectors.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single level", () => {
      const singleLevel = [mockLevels[0]];
      render(<LevelManagement levels={singleLevel} locale="en" />);

      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();

      // Should not show "Next level" text
      expect(screen.queryByText(/Next level:/)).not.toBeInTheDocument();
    });

    it("should handle levels with very large star requirements", () => {
      const levelWithLargeStars = [
        { ...mockLevels[0], stars_required: 1000000 },
      ];
      render(<LevelManagement levels={levelWithLargeStars} locale="en" />);

      expect(screen.getByText("1,000,000 ⭐")).toBeInTheDocument();
    });

    it("should handle levels out of order", () => {
      const unorderedLevels = [mockLevels[2], mockLevels[0], mockLevels[1]];
      render(<LevelManagement levels={unorderedLevels} locale="en" />);

      // Should still display all levels
      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Explorer")).toBeInTheDocument();
      expect(screen.getByText("Adventurer")).toBeInTheDocument();
    });
  });
});
