import { render, screen, fireEvent } from "@testing-library/react";
import ParentRedeemSection from "@/components/admin/ParentRedeemSection";

// Mock RewardGrid child component
jest.mock("@/components/child/RewardGrid", () => {
  return function MockRewardGrid(props: any) {
    return (
      <div data-testid="reward-grid">
        <span>RewardGrid</span>
        <span data-testid="reward-grid-child-id">{props.childId}</span>
        <span data-testid="reward-grid-is-parent">{String(props.isParent)}</span>
      </div>
    );
  };
});

describe("ParentRedeemSection", () => {
  const mockChildren = [
    {
      id: "child-1",
      name: "Alice",
      avatar_url: null,
      email: "alice@example.com",
      role: "child" as const,
      family_id: "family-1",
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "child-2",
      name: "Bob",
      avatar_url: "😊",
      email: "bob@example.com",
      role: "child" as const,
      family_id: "family-1",
      created_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockRewards = [
    {
      id: "reward-1",
      name_en: "Ice Cream",
      name_zh: "冰淇淋",
      icon: "🍦",
      stars_cost: 5,
      is_active: true,
      family_id: "family-1",
      description: null,
      category: null,
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "reward-2",
      name_en: "Movie Night",
      name_zh: "电影之夜",
      icon: "🎬",
      stars_cost: 10,
      is_active: false, // inactive
      family_id: "family-1",
      description: null,
      category: null,
      created_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockChildBalances = [
    { child_id: "child-1", current_stars: 20, spendable_stars: 15 },
    { child_id: "child-2", current_stars: 30, spendable_stars: 25 },
  ];

  const baseProps = {
    children: mockChildren as any[],
    rewards: mockRewards as any[],
    childBalances: mockChildBalances,
    locale: "en",
    familyId: "family-1",
    parentId: "parent-1",
  };

  describe("Rendering", () => {
    it("renders the section header", () => {
      render(<ParentRedeemSection {...baseProps} />);
      expect(screen.getByText("admin.quickRedeem")).toBeInTheDocument();
    });

    it("renders child selector with all children", () => {
      render(<ParentRedeemSection {...baseProps} />);
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("shows child balances in selector", () => {
      render(<ParentRedeemSection {...baseProps} />);
      expect(screen.getByText(/20/)).toBeInTheDocument();
      expect(screen.getByText(/30/)).toBeInTheDocument();
    });

    it("shows description text in English", () => {
      render(<ParentRedeemSection {...baseProps} />);
      expect(
        screen.getByText(/Redeem rewards for your child directly/)
      ).toBeInTheDocument();
    });

    it("shows description text in Chinese", () => {
      render(<ParentRedeemSection {...baseProps} locale="zh-CN" />);
      expect(
        screen.getByText(/直接为孩子兑换奖励/)
      ).toBeInTheDocument();
    });
  });

  describe("No Children", () => {
    it("shows no children message when there are no children", () => {
      render(<ParentRedeemSection {...baseProps} children={[]} />);
      expect(
        screen.getByText("admin.noChildrenInFamily")
      ).toBeInTheDocument();
    });

    it("still shows the header when no children", () => {
      render(<ParentRedeemSection {...baseProps} children={[]} />);
      expect(screen.getByText("admin.quickRedeem")).toBeInTheDocument();
    });
  });

  describe("Child Selection", () => {
    it("auto-selects child when there is only one", () => {
      const singleChild = [mockChildren[0]];
      render(
        <ParentRedeemSection
          {...baseProps}
          children={singleChild as any[]}
        />
      );
      // Should auto-select and show reward grid
      expect(screen.getByTestId("reward-grid")).toBeInTheDocument();
    });

    it("shows select child prompt when no child is selected", () => {
      render(<ParentRedeemSection {...baseProps} />);
      expect(
        screen.getByText("Please select a child first")
      ).toBeInTheDocument();
    });

    it("shows Chinese prompt when locale is zh-CN and no child selected", () => {
      render(<ParentRedeemSection {...baseProps} locale="zh-CN" />);
      expect(screen.getByText("请先选择一个孩子")).toBeInTheDocument();
    });

    it("selects a child when clicked", () => {
      render(<ParentRedeemSection {...baseProps} />);
      fireEvent.click(screen.getByText("Alice"));

      // Should show reward grid with selected child
      expect(screen.getByTestId("reward-grid")).toBeInTheDocument();
      expect(screen.getByTestId("reward-grid-child-id")).toHaveTextContent(
        "child-1"
      );
    });

    it("shows spendable stars for selected child", () => {
      render(<ParentRedeemSection {...baseProps} />);
      fireEvent.click(screen.getByText("Alice"));

      expect(screen.getByText(/15/)).toBeInTheDocument();
    });

    it("shows checkmark for selected child", () => {
      render(<ParentRedeemSection {...baseProps} />);
      fireEvent.click(screen.getByText("Alice"));

      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("passes isParent=true to RewardGrid", () => {
      render(<ParentRedeemSection {...baseProps} />);
      fireEvent.click(screen.getByText("Alice"));

      expect(screen.getByTestId("reward-grid-is-parent")).toHaveTextContent(
        "true"
      );
    });
  });

  describe("No Active Rewards", () => {
    it("shows no data message when all rewards are inactive", () => {
      const inactiveRewards = mockRewards.map((r) => ({
        ...r,
        is_active: false,
      }));
      render(
        <ParentRedeemSection
          {...baseProps}
          rewards={inactiveRewards as any[]}
          children={[mockChildren[0]] as any[]}
        />
      );
      // Auto-selects child, should show no data
      expect(screen.getByText("common.noData")).toBeInTheDocument();
    });
  });

  describe("Avatar Display", () => {
    it("shows default avatar when avatar_url is null", () => {
      render(<ParentRedeemSection {...baseProps} />);
      expect(screen.getByText("👤")).toBeInTheDocument();
    });

    it("shows custom avatar when avatar_url is set", () => {
      render(<ParentRedeemSection {...baseProps} />);
      expect(screen.getByText("😊")).toBeInTheDocument();
    });
  });

  describe("Branch coverage", () => {
    it("shows 0 stars when child has no balance entry", () => {
      // Render with an empty childBalances array so no child has a matching balance
      render(
        <ParentRedeemSection
          {...baseProps}
          childBalances={[]}
        />
      );

      // Each child card should show "0 ⭐" since balance?.current_stars || 0
      const zeroStars = screen.getAllByText(/^0/);
      expect(zeroStars.length).toBeGreaterThanOrEqual(2); // Both Alice and Bob show 0
    });

    it("shows select child prompt with pointer emoji when multiple children and none selected", () => {
      render(<ParentRedeemSection {...baseProps} />);

      // With 2+ children and none selected, should show the prompt with 👆 emoji
      expect(screen.getByText("👆")).toBeInTheDocument();
      expect(
        screen.getByText("Please select a child first")
      ).toBeInTheDocument();
    });
  });
});
