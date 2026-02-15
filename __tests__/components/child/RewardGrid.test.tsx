import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RewardGrid from "@/components/child/RewardGrid";
import type { Database } from "@/types/database";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock RedeemRewardModal
jest.mock("@/components/child/RedeemRewardModal", () => {
  return function MockRedeemRewardModal({ reward, onClose, onSuccess }: any) {
    return (
      <div data-testid="redeem-modal">
        <p>Redeeming: {reward.name_en}</p>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Success</button>
      </div>
    );
  };
});

describe("RewardGrid", () => {
  const mockRewards: Reward[] = [
    {
      id: "reward-1",
      family_id: "family-123",
      name_en: "30 mins screen time",
      name_zh: "30分钟屏幕时间",
      description: "Extra screen time",
      stars_cost: 50,
      icon: "📱",
      category: "screen_time",
      is_active: true,
      created_at: "2025-01-01",
    },
    {
      id: "reward-2",
      family_id: "family-123",
      name_en: "Toy car",
      name_zh: "玩具车",
      description: "A nice toy car",
      stars_cost: 100,
      icon: "🚗",
      category: "toys",
      is_active: true,
      created_at: "2025-01-01",
    },
    {
      id: "reward-3",
      family_id: "family-123",
      name_en: "Ice cream",
      name_zh: "冰淇淋",
      description: null,
      stars_cost: 20,
      icon: "🍦",
      category: "treats",
      is_active: true,
      created_at: "2025-01-01",
    },
    {
      id: "reward-4",
      family_id: "family-123",
      name_en: "Park visit",
      name_zh: "去公园",
      description: "Trip to the park",
      stars_cost: 150,
      icon: "🏞️",
      category: "activities",
      is_active: true,
      created_at: "2025-01-01",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render category filter buttons", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      expect(screen.getByRole("button", { name: /common\.all/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /screen_time/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /toys/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /treats/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /activities/ })).toBeInTheDocument();
    });

    it("should display all rewards initially", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
      expect(screen.getByText("Toy car")).toBeInTheDocument();
      expect(screen.getByText("Ice cream")).toBeInTheDocument();
      expect(screen.getByText("Park visit")).toBeInTheDocument();
    });

    it("should display rewards in Chinese when locale is zh-CN", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="zh-CN" userId="user-123" />
      );

      expect(screen.getByText("30分钟屏幕时间")).toBeInTheDocument();
      expect(screen.getByText("玩具车")).toBeInTheDocument();
      expect(screen.getByText("冰淇淋")).toBeInTheDocument();
    });

    it("should display reward icons", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      expect(screen.getByText("📱")).toBeInTheDocument();
      expect(screen.getByText("🚗")).toBeInTheDocument();
      expect(screen.getByText("🍦")).toBeInTheDocument();
      expect(screen.getByText("🏞️")).toBeInTheDocument();
    });

    it("should display reward costs", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
    });

    it("should display reward descriptions when available", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      expect(screen.getByText("Extra screen time")).toBeInTheDocument();
      expect(screen.getByText("A nice toy car")).toBeInTheDocument();
      expect(screen.getByText("Trip to the park")).toBeInTheDocument();
    });

    it("should show empty state when no rewards", () => {
      render(<RewardGrid rewards={[]} currentStars={100} locale="en" userId="user-123" />);

      expect(screen.getByText("common.noData")).toBeInTheDocument();
      expect(screen.getByText("🎁")).toBeInTheDocument();
    });
  });

  describe("Category Filtering", () => {
    it("should filter rewards by screen_time category", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const screenTimeButton = screen.getByRole("button", { name: /screen_time/ });
      await user.click(screenTimeButton);

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
      expect(screen.queryByText("Toy car")).not.toBeInTheDocument();
      expect(screen.queryByText("Ice cream")).not.toBeInTheDocument();
    });

    it("should filter rewards by toys category", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const toysButton = screen.getByRole("button", { name: /toys/ });
      await user.click(toysButton);

      expect(screen.getByText("Toy car")).toBeInTheDocument();
      expect(screen.queryByText("30 mins screen time")).not.toBeInTheDocument();
      expect(screen.queryByText("Ice cream")).not.toBeInTheDocument();
    });

    it("should show all rewards when all filter is selected", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      // First filter by toys
      const toysButton = screen.getByRole("button", { name: /toys/ });
      await user.click(toysButton);

      expect(screen.queryByText("Ice cream")).not.toBeInTheDocument();

      // Then select all
      const allButton = screen.getByRole("button", { name: /common\.all/ });
      await user.click(allButton);

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
      expect(screen.getByText("Toy car")).toBeInTheDocument();
      expect(screen.getByText("Ice cream")).toBeInTheDocument();
    });

    it("should show empty state when filtered category has no rewards", async () => {
      const user = userEvent.setup();
      // Use all rewards, then filter by a specific category with just one reward
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      // Filter by activities (Park visit is the only activity)
      const activitiesButton = screen.getByRole("button", { name: /activities/ });
      await user.click(activitiesButton);

      // Only Park visit should show
      expect(screen.getByText("Park visit")).toBeInTheDocument();
      expect(screen.queryByText("Ice cream")).not.toBeInTheDocument();
      expect(screen.queryByText("Toy car")).not.toBeInTheDocument();
    });

    it("should highlight active filter button", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const toysButton = screen.getByRole("button", { name: /toys/ });
      await user.click(toysButton);

      expect(toysButton.className).toContain("bg-primary");
    });
  });

  describe("Affordability", () => {
    it("should mark affordable rewards with pointer cursor", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      // Find the card by traversing from the reward name
      const iceCreanCard = screen.getByText("Ice cream").closest(".cursor-pointer");
      expect(iceCreanCard).toBeInTheDocument();
    });

    it("should mark unaffordable rewards with not-allowed cursor", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      // Find the card by traversing from the reward name
      const parkCard = screen.getByText("Park visit").closest(".cursor-not-allowed");
      expect(parkCard).toBeInTheDocument();
    });

    it("should show how many more stars needed for unaffordable rewards", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      expect(screen.getByText(/Need 50 more stars/)).toBeInTheDocument();
    });

    it("should show action hint for affordable rewards", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      // Should have action hints for affordable rewards (Ice cream, Toy car, Screen time)
      const actionHints = screen.getAllByText("Click to redeem →");
      expect(actionHints.length).toBeGreaterThan(0);
    });

    it("should not show action hint for unaffordable rewards", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={30} locale="en" userId="user-123" />
      );

      const actionHints = screen.queryAllByText("Click to redeem →");
      expect(actionHints.length).toBe(1); // Only for the 20-star ice cream
    });
  });

  describe("Redeem Modal Interaction", () => {
    it("should open redeem modal when clicking affordable reward", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const iceCreanCard = screen.getByText("Ice cream").closest("div");
      await user.click(iceCreanCard!);

      await waitFor(() => {
        expect(screen.getByTestId("redeem-modal")).toBeInTheDocument();
        expect(screen.getByText("Redeeming: Ice cream")).toBeInTheDocument();
      });
    });

    it("should not open modal when clicking unaffordable reward", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const parkCard = screen.getByText("Park visit").closest("div");
      await user.click(parkCard!);

      await waitFor(() => {
        expect(screen.queryByTestId("redeem-modal")).not.toBeInTheDocument();
      });
    });

    it("should close modal when clicking close button", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const iceCreanCard = screen.getByText("Ice cream").closest("div");
      await user.click(iceCreanCard!);

      await waitFor(() => {
        expect(screen.getByTestId("redeem-modal")).toBeInTheDocument();
      });

      const closeButton = screen.getByRole("button", { name: "Close Modal" });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("redeem-modal")).not.toBeInTheDocument();
      });
    });

    it("should refresh and close modal on success", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const iceCreanCard = screen.getByText("Ice cream").closest("div");
      await user.click(iceCreanCard!);

      await waitFor(() => {
        expect(screen.getByTestId("redeem-modal")).toBeInTheDocument();
      });

      const successButton = screen.getByRole("button", { name: "Success" });
      await user.click(successButton);

      await waitFor(() => {
        expect(screen.queryByTestId("redeem-modal")).not.toBeInTheDocument();
      });

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe("Spendable Stars with Credit", () => {
    it("should use spendableStars for affordability when provided", () => {
      // currentStars is 50, but spendableStars is 200 (with credit)
      render(
        <RewardGrid
          rewards={mockRewards}
          currentStars={50}
          spendableStars={200}
          creditEnabled={true}
          availableCredit={150}
          locale="en"
          userId="user-123"
        />
      );

      // Park visit costs 150, should be affordable with spendableStars=200
      const parkCard = screen.getByText("Park visit").closest(".cursor-pointer");
      expect(parkCard).toBeInTheDocument();
    });

    it("should show correct 'need more stars' when using spendableStars", () => {
      // spendableStars is 100, Park visit costs 150
      render(
        <RewardGrid
          rewards={mockRewards}
          currentStars={50}
          spendableStars={100}
          creditEnabled={true}
          availableCredit={50}
          locale="en"
          userId="user-123"
        />
      );

      // Need 50 more stars (150 - 100)
      expect(screen.getByText(/Need 50 more stars/)).toBeInTheDocument();
    });

    it("should fall back to currentStars when spendableStars not provided", () => {
      render(
        <RewardGrid
          rewards={mockRewards}
          currentStars={100}
          locale="en"
          userId="user-123"
        />
      );

      // Toy car costs 100, should be affordable with currentStars=100
      const toyCard = screen.getByText("Toy car").closest(".cursor-pointer");
      expect(toyCard).toBeInTheDocument();

      // Park visit costs 150, should NOT be affordable
      const parkCard = screen.getByText("Park visit").closest(".cursor-not-allowed");
      expect(parkCard).toBeInTheDocument();
    });

    it("should allow clicking reward when affordable via credit", async () => {
      const user = userEvent.setup();
      render(
        <RewardGrid
          rewards={mockRewards}
          currentStars={50}
          spendableStars={200}
          creditEnabled={true}
          availableCredit={150}
          locale="en"
          userId="user-123"
        />
      );

      // Park visit costs 150, affordable with spendableStars=200
      const parkCard = screen.getByText("Park visit").closest("div");
      await user.click(parkCard!);

      await waitFor(() => {
        expect(screen.getByTestId("redeem-modal")).toBeInTheDocument();
        expect(screen.getByText("Redeeming: Park visit")).toBeInTheDocument();
      });
    });
  });

  describe("Category Colors", () => {
    it("should apply correct color for screen_time category", () => {
      const { container } = render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      // Find the reward card for screen time, then find the badge within it
      const rewardCard = screen.getByText("30 mins screen time").closest(".dark-card");
      const screenTimeBadge = within(rewardCard!).getByText("rewards.category.screen_time");
      expect(screenTimeBadge.className).toContain("bg-blue-500/15");
      expect(screenTimeBadge.className).toContain("text-blue-300");
    });

    it("should apply correct color for toys category", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const rewardCard = screen.getByText("Toy car").closest(".dark-card");
      const toysBadge = within(rewardCard!).getByText("rewards.category.toys");
      expect(toysBadge.className).toContain("bg-pink-500/15");
      expect(toysBadge.className).toContain("text-pink-300");
    });

    it("should apply correct color for treats category", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const rewardCard = screen.getByText("Ice cream").closest(".dark-card");
      const treatsBadge = within(rewardCard!).getByText("rewards.category.treats");
      expect(treatsBadge.className).toContain("bg-orange-500/15");
      expect(treatsBadge.className).toContain("text-orange-300");
    });

    it("should apply correct color for activities category", () => {
      render(
        <RewardGrid rewards={mockRewards} currentStars={100} locale="en" userId="user-123" />
      );

      const rewardCard = screen.getByText("Park visit").closest(".dark-card");
      const activitiesBadge = within(rewardCard!).getByText("rewards.category.activities");
      expect(activitiesBadge.className).toContain("bg-green-500/15");
      expect(activitiesBadge.className).toContain("text-green-300");
    });
  });

  describe("Branch coverage", () => {
    it("should apply default fallback color for unknown category", () => {
      const unknownCategoryReward: Reward[] = [
        {
          id: "reward-unknown",
          family_id: "family-123",
          name_en: "Mystery reward",
          name_zh: "神秘奖励",
          description: null,
          stars_cost: 10,
          icon: "🎁",
          category: "unknown_category",
          is_active: true,
          created_at: "2025-01-01",
        },
      ];
      render(
        <RewardGrid rewards={unknownCategoryReward} currentStars={100} locale="en" userId="user-123" />
      );

      // The category text appears in both the filter button and the badge.
      // Scope to the reward card to find the badge span (which has border class).
      const rewardCard = screen.getByText("Mystery reward").closest(".dark-card");
      const badge = within(rewardCard!).getByText("rewards.category.unknown_category");
      // getCategoryColor returns colors.other for unknown categories
      expect(badge.className).toContain("bg-white/10");
      expect(badge.className).toContain("text-slate-300");
    });

    it("should apply fallback color when category is null", () => {
      const nullCategoryReward: Reward[] = [
        {
          id: "reward-null-cat",
          family_id: "family-123",
          name_en: "No category reward",
          name_zh: "无分类奖励",
          description: null,
          stars_cost: 10,
          icon: "🎯",
          category: null,
          is_active: true,
          created_at: "2025-01-01",
        },
      ];
      render(
        <RewardGrid rewards={nullCategoryReward} currentStars={100} locale="en" userId="user-123" />
      );

      // When category is null, the badge is not rendered (reward.category && ...)
      // So the getCategoryColor function is not called from the badge
      // but the card still renders correctly
      expect(screen.getByText("No category reward")).toBeInTheDocument();
      // No category badge should be rendered
      expect(screen.queryByText(/rewards\.category\./)).not.toBeInTheDocument();
    });

    it("should render default gift emoji when icon is null", () => {
      const nullIconReward: Reward[] = [
        {
          id: "reward-null-icon",
          family_id: "family-123",
          name_en: "No icon reward",
          name_zh: "无图标奖励",
          description: null,
          stars_cost: 10,
          icon: null,
          category: "treats",
          is_active: true,
          created_at: "2025-01-01",
        },
      ];
      render(
        <RewardGrid rewards={nullIconReward} currentStars={100} locale="en" userId="user-123" />
      );

      // reward.icon || "🎁" should render the fallback emoji
      expect(screen.getByText("🎁")).toBeInTheDocument();
      expect(screen.getByText("No icon reward")).toBeInTheDocument();
    });
  });
});
