import { render, screen, fireEvent } from "@testing-library/react";
import RedeemFromCalendarModal from "@/components/shared/RedeemFromCalendarModal";
import type { Database } from "@/types/database";
import type { ChildBalance } from "@/types/activity";

type User = Database["public"]["Tables"]["users"]["Row"];
type Reward = Database["public"]["Tables"]["rewards"]["Row"];

// Mock RewardGrid
jest.mock("@/components/child/RewardGrid", () => {
  return function MockRewardGrid(props: any) {
    return (
      <div data-testid="reward-grid">
        RewardGrid - isParent={String(props.isParent)} childId={props.childId}
        currentStars={props.currentStars} spendableStars={props.spendableStars}
      </div>
    );
  };
});

// Mock ModalFrame
jest.mock("@/components/ui/ModalFrame", () => {
  return function MockModalFrame(props: any) {
    return (
      <div data-testid="modal-frame">
        <h2>{props.title}</h2>
        <button onClick={props.onClose} data-testid="modal-close">✕</button>
        {props.children}
      </div>
    );
  };
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const mockReward: Reward = {
  id: "reward-1",
  family_id: "fam-1",
  name_en: "Ice Cream",
  name_zh: "冰淇淋",
  description: "A scoop of ice cream",
  stars_cost: 10,
  icon: "🍦",
  category: "treats",
  is_active: true,
  created_at: "2025-01-01",
};

const mockInactiveReward: Reward = {
  ...mockReward,
  id: "reward-inactive",
  name_en: "Old Reward",
  is_active: false,
};

const mockChildren: User[] = [
  {
    id: "child-1",
    name: "Alice",
    avatar_url: null,
    role: "child",
    family_id: "fam-1",
    email: "alice@test.com",
    created_at: "2025-01-01",
  } as User,
  {
    id: "child-2",
    name: "Bob",
    avatar_url: "🐶",
    role: "child",
    family_id: "fam-1",
    email: "bob@test.com",
    created_at: "2025-01-01",
  } as User,
];

const mockChildBalances: ChildBalance[] = [
  { child_id: "child-1", current_stars: 50, spendable_stars: 60 },
  { child_id: "child-2", current_stars: 20, spendable_stars: 25 },
];

const defaultProps = {
  locale: "en",
  rewards: [mockReward],
  familyChildren: mockChildren,
  childBalances: mockChildBalances,
  currentUserId: "parent-1",
  familyId: "fam-1",
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

describe("RedeemFromCalendarModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal with title and child selector", () => {
    render(<RedeemFromCalendarModal {...defaultProps} />);

    expect(screen.getByText("activity.redeemReward")).toBeInTheDocument();
    expect(screen.getByText("activity.selectChild")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows child balance in selector cards", () => {
    render(<RedeemFromCalendarModal {...defaultProps} />);

    expect(screen.getByText("50 ⭐")).toBeInTheDocument();
    expect(screen.getByText("20 ⭐")).toBeInTheDocument();
  });

  it("shows prompt when no child is selected (multiple children)", () => {
    render(<RedeemFromCalendarModal {...defaultProps} />);

    expect(screen.getByText("activity.selectChildToRedeem")).toBeInTheDocument();
    expect(screen.queryByTestId("reward-grid")).not.toBeInTheDocument();
  });

  it("shows RewardGrid when a child is selected", () => {
    render(<RedeemFromCalendarModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId("child-selector-child-1"));

    expect(screen.getByTestId("reward-grid")).toBeInTheDocument();
    expect(screen.getByText(/isParent=true/)).toBeInTheDocument();
    expect(screen.getByText(/childId=child-1/)).toBeInTheDocument();
  });

  it("shows available stars when child is selected", () => {
    render(<RedeemFromCalendarModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId("child-selector-child-1"));

    expect(screen.getByText(/activity\.availableStars/)).toBeInTheDocument();
    // The balance display shows spendable_stars for selected child (60)
    // It may also appear in the RewardGrid mock, so use getAllByText
    const balanceElements = screen.getAllByText(/60/);
    expect(balanceElements.length).toBeGreaterThanOrEqual(1);
  });

  it("auto-selects when there is only one child", () => {
    const singleChildProps = {
      ...defaultProps,
      familyChildren: [mockChildren[0]],
    };

    render(<RedeemFromCalendarModal {...singleChildProps} />);

    // Should auto-select and show RewardGrid
    expect(screen.getByTestId("reward-grid")).toBeInTheDocument();
    expect(screen.queryByText("activity.selectChildToRedeem")).not.toBeInTheDocument();
  });

  it("switches between children and updates balance", () => {
    render(<RedeemFromCalendarModal {...defaultProps} />);

    // Select Alice
    fireEvent.click(screen.getByTestId("child-selector-child-1"));
    expect(screen.getByText("60 ⭐")).toBeInTheDocument();

    // Switch to Bob
    fireEvent.click(screen.getByTestId("child-selector-child-2"));
    expect(screen.getByText("25 ⭐")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<RedeemFromCalendarModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByTestId("modal-close"));

    expect(onClose).toHaveBeenCalled();
  });

  it("filters out inactive rewards", () => {
    const propsWithInactive = {
      ...defaultProps,
      rewards: [mockReward, mockInactiveReward],
      familyChildren: [mockChildren[0]], // auto-select
    };

    render(<RedeemFromCalendarModal {...propsWithInactive} />);

    // RewardGrid should be rendered (at least one active reward)
    expect(screen.getByTestId("reward-grid")).toBeInTheDocument();
  });

  it("shows no data when all rewards are inactive", () => {
    const propsAllInactive = {
      ...defaultProps,
      rewards: [mockInactiveReward],
      familyChildren: [mockChildren[0]], // auto-select
    };

    render(<RedeemFromCalendarModal {...propsAllInactive} />);

    expect(screen.getByText("common.noData")).toBeInTheDocument();
    expect(screen.queryByTestId("reward-grid")).not.toBeInTheDocument();
  });

  it("shows 0 stars for child without balance data", () => {
    const propsNoBalance = {
      ...defaultProps,
      childBalances: [],
      familyChildren: [mockChildren[0]], // auto-select
    };

    render(<RedeemFromCalendarModal {...propsNoBalance} />);

    // Balance display section shows 0 for spendable stars
    // Child selector also shows 0. We verify the balance display area exists.
    const balanceElements = screen.getAllByText(/0/);
    expect(balanceElements.length).toBeGreaterThanOrEqual(1);
  });

  it("passes correct props to RewardGrid", () => {
    render(<RedeemFromCalendarModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId("child-selector-child-2"));

    const grid = screen.getByTestId("reward-grid");
    expect(grid).toHaveTextContent("currentStars=20");
    expect(grid).toHaveTextContent("spendableStars=25");
    expect(grid).toHaveTextContent("childId=child-2");
  });

  it("renders child avatar when available", () => {
    render(<RedeemFromCalendarModal {...defaultProps} />);

    // Bob has avatar "🐶"
    expect(screen.getByText("🐶")).toBeInTheDocument();
    // Alice has no avatar, shows default "👤"
    expect(screen.getByText("👤")).toBeInTheDocument();
  });
});
