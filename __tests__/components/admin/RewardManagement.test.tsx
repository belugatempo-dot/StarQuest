import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RewardManagement from "@/components/admin/RewardManagement";
import type { Database } from "@/types/database";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];

// Mock next/navigation
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock RewardFormModal
jest.mock("@/components/admin/RewardFormModal", () => {
  return function MockRewardFormModal({ reward, onClose, onSuccess }: any) {
    return (
      <div data-testid="reward-form-modal">
        <p>{reward ? "Editing Reward" : "Adding Reward"}</p>
        {reward && <p>{reward.name_en}</p>}
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Success</button>
      </div>
    );
  };
});

// Mock Supabase client
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn(() => ({ data: null, error: null }));
const mockFrom = jest.fn((table: string) => {
  if (table === "rewards") {
    return {
      update: mockUpdate.mockReturnValue({ eq: mockEq }),
      delete: mockDelete.mockReturnValue({ eq: mockEq }),
    };
  }
  return {};
});

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock window.confirm
global.confirm = jest.fn(() => true);

describe("RewardManagement", () => {
  const mockRewards: Reward[] = [
    {
      id: "reward-1",
      family_id: "family-123",
      name_en: "30 mins screen time",
      name_zh: "30分钟屏幕时间",
      stars_cost: 50,
      category: "screen_time",
      description: "Tablet or phone time",
      icon: "📱",
      is_active: true,
      created_at: "2025-01-01",
    },
    {
      id: "reward-2",
      family_id: "family-123",
      name_en: "Small toy",
      name_zh: "小玩具",
      stars_cost: 100,
      category: "toys",
      description: null,
      icon: "🧸",
      is_active: true,
      created_at: "2025-01-01",
    },
    {
      id: "reward-3",
      family_id: "family-123",
      name_en: "Ice cream",
      name_zh: "冰淇淋",
      stars_cost: 30,
      category: "treats",
      description: "One scoop",
      icon: "🍦",
      is_active: false,
      created_at: "2025-01-01",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ data: null, error: null });
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  describe("Rendering", () => {
    it("should display rewards count", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByText("3 rewards")).toBeInTheDocument();
    });

    it("should display Chinese rewards count when locale is zh-CN", () => {
      render(<RewardManagement rewards={mockRewards} locale="zh-CN" familyId="family-123" />);

      expect(screen.getByText("共 3 个奖励")).toBeInTheDocument();
    });

    it("should display add reward button", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByRole("button", { name: /Add Reward/ })).toBeInTheDocument();
    });

    it("should display all rewards", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
      expect(screen.getByText("Small toy")).toBeInTheDocument();
      expect(screen.getByText("Ice cream")).toBeInTheDocument();
    });

    it("should display Chinese reward names when locale is zh-CN", () => {
      render(<RewardManagement rewards={mockRewards} locale="zh-CN" familyId="family-123" />);

      expect(screen.getByText("30分钟屏幕时间")).toBeInTheDocument();
      expect(screen.getByText("小玩具")).toBeInTheDocument();
      expect(screen.getByText("冰淇淋")).toBeInTheDocument();
    });

    it("should display reward icons", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByText("📱")).toBeInTheDocument();
      expect(screen.getByText("🧸")).toBeInTheDocument();
      expect(screen.getByText("🍦")).toBeInTheDocument();
    });

    it("should display stars cost for each reward", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
    });

    it("should display descriptions when present", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByText("Tablet or phone time")).toBeInTheDocument();
      expect(screen.getByText("One scoop")).toBeInTheDocument();
    });

    it("should display inactive badge for inactive rewards", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("should display Chinese inactive badge when locale is zh-CN", () => {
      render(<RewardManagement rewards={mockRewards} locale="zh-CN" familyId="family-123" />);

      expect(screen.getByText("已停用")).toBeInTheDocument();
    });

    it("should display category badges", () => {
      const { container } = render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      // Category badges are in spans with rounded-full class
      const categoryBadges = container.querySelectorAll("span.rounded-full");
      const categoryTexts = Array.from(categoryBadges).map(badge => badge.textContent);

      expect(categoryTexts).toContain("rewards.category.screen_time");
      expect(categoryTexts).toContain("rewards.category.toys");
      expect(categoryTexts).toContain("rewards.category.treats");
    });

    it("should display edit button for each reward", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const editButtons = screen.getAllByRole("button", { name: /Edit/ });
      expect(editButtons).toHaveLength(3);
    });

    it("should display Enable button for inactive rewards", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByRole("button", { name: /Enable/ })).toBeInTheDocument();
    });

    it("should display Disable buttons for active rewards", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const disableButtons = screen.getAllByRole("button", { name: /Disable/ });
      expect(disableButtons).toHaveLength(2);
    });

    it("should display delete button for each reward", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const allButtons = screen.getAllByRole("button");
      const trashButtons = allButtons.filter(btn => btn.textContent?.includes("🗑️"));
      expect(trashButtons).toHaveLength(3);
    });

    it("should fallback to English name when Chinese name is null", () => {
      const rewardsWithoutZh = [{ ...mockRewards[0], name_zh: null }];
      render(<RewardManagement rewards={rewardsWithoutZh} locale="zh-CN" familyId="family-123" />);

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
    });

    it("should display fallback icon when reward has no icon", () => {
      const rewardsWithoutIcon = [{ ...mockRewards[0], icon: null }];
      render(<RewardManagement rewards={rewardsWithoutIcon} locale="en" familyId="family-123" />);

      expect(screen.getByText("🎁")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no rewards", () => {
      render(<RewardManagement rewards={[]} locale="en" familyId="family-123" />);

      expect(screen.getByText("No rewards yet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Add First Reward/ })).toBeInTheDocument();
    });

    it("should show Chinese empty state when locale is zh-CN", () => {
      render(<RewardManagement rewards={[]} locale="zh-CN" familyId="family-123" />);

      expect(screen.getByText("还没有奖励")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /添加第一个奖励/ })).toBeInTheDocument();
    });
  });

  describe("Category Filter", () => {
    it("should display category filter buttons", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      expect(screen.getByRole("button", { name: "common.all" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "rewards.category.screen_time" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "rewards.category.toys" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "rewards.category.treats" })).toBeInTheDocument();
    });

    it("should highlight 'all' filter by default", () => {
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const allButton = screen.getByRole("button", { name: "common.all" });
      expect(allButton.className).toContain("bg-primary");
    });

    it("should filter rewards by category", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const toysButton = screen.getByRole("button", { name: "rewards.category.toys" });
      await user.click(toysButton);

      expect(screen.getByText("Small toy")).toBeInTheDocument();
      expect(screen.queryByText("30 mins screen time")).not.toBeInTheDocument();
      expect(screen.queryByText("Ice cream")).not.toBeInTheDocument();
    });

    it("should show all rewards when clicking 'all' filter", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      // Filter to toys
      const toysButton = screen.getByRole("button", { name: "rewards.category.toys" });
      await user.click(toysButton);

      // Go back to all
      const allButton = screen.getByRole("button", { name: "common.all" });
      await user.click(allButton);

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
      expect(screen.getByText("Small toy")).toBeInTheDocument();
      expect(screen.getByText("Ice cream")).toBeInTheDocument();
    });

    it("should filter correctly and hide other categories", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const screenTimeButton = screen.getByRole("button", { name: "rewards.category.screen_time" });
      await user.click(screenTimeButton);

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
      expect(screen.queryByText("Small toy")).not.toBeInTheDocument();
      expect(screen.queryByText("Ice cream")).not.toBeInTheDocument();
    });
  });

  describe("Modal Interaction", () => {
    it("should open add modal when add button is clicked", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const addButton = screen.getByRole("button", { name: /Add Reward/ });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId("reward-form-modal")).toBeInTheDocument();
      });
      expect(screen.getByText("Adding Reward")).toBeInTheDocument();
    });

    it("should open add modal from empty state button", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={[]} locale="en" familyId="family-123" />);

      const addButton = screen.getByRole("button", { name: /Add First Reward/ });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId("reward-form-modal")).toBeInTheDocument();
      });
    });

    it("should open edit modal when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const editButtons = screen.getAllByRole("button", { name: /Edit/ });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId("reward-form-modal")).toBeInTheDocument();
        expect(screen.getByText("Editing Reward")).toBeInTheDocument();
      });
    });

    it("should close modal when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const addButton = screen.getByRole("button", { name: /Add Reward/ });
      await user.click(addButton);

      expect(screen.getByTestId("reward-form-modal")).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: "Close Modal" });
      await user.click(closeButton);

      expect(screen.queryByTestId("reward-form-modal")).not.toBeInTheDocument();
    });

    it("should close modal and refresh on success", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const addButton = screen.getByRole("button", { name: /Add Reward/ });
      await user.click(addButton);

      const successButton = screen.getByRole("button", { name: "Success" });
      await user.click(successButton);

      expect(screen.queryByTestId("reward-form-modal")).not.toBeInTheDocument();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe("Toggle Active/Inactive", () => {
    it("should toggle reward to inactive", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const disableButtons = screen.getAllByRole("button", { name: /Disable/ });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      });

      expect(mockEq).toHaveBeenCalledWith("id", "reward-1");
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("should toggle reward to active", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const enableButton = screen.getByRole("button", { name: /Enable/ });
      await user.click(enableButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ is_active: true });
      });

      expect(mockEq).toHaveBeenCalledWith("id", "reward-3");
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("should handle toggle error", async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      mockEq.mockResolvedValueOnce({
        data: null,
        error: new Error("Toggle failed"),
      });

      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const disableButtons = screen.getAllByRole("button", { name: /Disable/ });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to toggle reward status");
      });

      alertSpy.mockRestore();
    });
  });

  describe("Delete Functionality", () => {
    it("should show confirmation dialog when deleting", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const allButtons = screen.getAllByRole("button");
      const deleteButtons = allButtons.filter(btn => btn.textContent?.includes("🗑️"));
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "30 mins screen time"?'
      );
    });

    it("should delete reward when confirmed", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const allButtons = screen.getAllByRole("button");
      const deleteButtons = allButtons.filter(btn => btn.textContent?.includes("🗑️"));
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
      });

      expect(mockEq).toHaveBeenCalledWith("id", "reward-1");
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("should not delete reward when cancelled", async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValueOnce(false);

      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const allButtons = screen.getAllByRole("button");
      const deleteButtons = allButtons.filter(btn => btn.textContent?.includes("🗑️"));
      await user.click(deleteButtons[0]);

      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("should show Chinese confirmation when locale is zh-CN", async () => {
      const user = userEvent.setup();
      render(<RewardManagement rewards={mockRewards} locale="zh-CN" familyId="family-123" />);

      const allButtons = screen.getAllByRole("button");
      const deleteButtons = allButtons.filter(btn => btn.textContent?.includes("🗑️"));
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        '确定要删除奖励 "30分钟屏幕时间" 吗？'
      );
    });

    it("should handle delete error", async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      mockEq.mockResolvedValueOnce({
        data: null,
        error: new Error("Delete failed"),
      });

      render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const allButtons = screen.getAllByRole("button");
      const deleteButtons = allButtons.filter(btn => btn.textContent?.includes("🗑️"));
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to delete reward");
      });

      alertSpy.mockRestore();
    });
  });

  describe("Visual Styling", () => {
    it("should apply category color to category badge", () => {
      const { container } = render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const categoryBadges = container.querySelectorAll(".bg-blue-100");
      expect(categoryBadges.length).toBeGreaterThan(0);
    });

    it("should apply opacity to inactive rewards", () => {
      const { container } = render(<RewardManagement rewards={mockRewards} locale="en" familyId="family-123" />);

      const inactiveCards = container.querySelectorAll(".opacity-60");
      expect(inactiveCards.length).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle reward with null category", () => {
      const rewardWithoutCategory = [{ ...mockRewards[0], category: null }];
      render(<RewardManagement rewards={rewardWithoutCategory} locale="en" familyId="family-123" />);

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
    });

    it("should not display category filter when no rewards", () => {
      render(<RewardManagement rewards={[]} locale="en" familyId="family-123" />);

      expect(screen.queryByRole("button", { name: "common.all" })).not.toBeInTheDocument();
    });
  });
});
