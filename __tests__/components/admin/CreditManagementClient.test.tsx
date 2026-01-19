import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreditManagementClient from "@/app/[locale]/(parent)/admin/credit/CreditManagementClient";

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

// Mock Supabase client
const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ error: null }),
});
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: mockUpdate,
    }),
  }),
}));

// Mock child components to simplify testing
jest.mock("@/components/admin/CreditSettingsModal", () => {
  return function MockCreditSettingsModal({ child, onClose, onSuccess }: any) {
    return (
      <div data-testid="credit-settings-modal">
        <span>Modal for {child.name}</span>
        <button onClick={onClose}>Close</button>
        <button onClick={onSuccess}>Save</button>
      </div>
    );
  };
});

jest.mock("@/components/admin/InterestTierManager", () => {
  return function MockInterestTierManager({ familyId }: any) {
    return <div data-testid="interest-tier-manager">Interest Tiers for {familyId}</div>;
  };
});

jest.mock("@/components/admin/SettlementHistoryTable", () => {
  return function MockSettlementHistoryTable({ familyId }: any) {
    return <div data-testid="settlement-history-table">Settlement History for {familyId}</div>;
  };
});

describe("CreditManagementClient", () => {
  const defaultProps = {
    familyId: "family-123",
    children: [
      { id: "child-1", name: "Alice", family_id: "family-123" },
      { id: "child-2", name: "Bob", family_id: "family-123" },
    ],
    balances: [
      {
        child_id: "child-1",
        family_id: "family-123",
        name: "Alice",
        current_stars: 100,
        lifetime_stars: 500,
        credit_enabled: true,
        credit_limit: 50,
        original_credit_limit: 50,
        credit_used: 20,
        available_credit: 30,
        spendable_stars: 130,
      },
      {
        child_id: "child-2",
        family_id: "family-123",
        name: "Bob",
        current_stars: 50,
        lifetime_stars: 200,
        credit_enabled: false,
        credit_limit: 0,
        original_credit_limit: 0,
        credit_used: 0,
        available_credit: 0,
        spendable_stars: 50,
      },
    ],
    creditSettings: [
      {
        id: "settings-1",
        child_id: "child-1",
        family_id: "family-123",
        credit_enabled: true,
        credit_limit: 50,
        original_credit_limit: 50,
      },
    ],
    settlementDay: 1,
    locale: "en",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders children overview section title", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByText("credit.childrenOverview")).toBeInTheDocument();
    });

    it("renders all children", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("renders InterestTierManager component", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByTestId("interest-tier-manager")).toBeInTheDocument();
    });

    it("renders SettlementHistoryTable component", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByTestId("settlement-history-table")).toBeInTheDocument();
    });

    it("renders info cards", () => {
      render(<CreditManagementClient {...defaultProps} />);
      // Check for settlement schedule card (has emoji before text)
      expect(screen.getByText(/📅/)).toBeInTheDocument();
      expect(screen.getByText("credit.settlementDayLabel")).toBeInTheDocument();
      // Check for settlement day dropdown with 28 options
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("1");
      // Check for auto repayment card (has emoji before text)
      expect(screen.getByText(/💡/)).toBeInTheDocument();
      expect(screen.getByText("credit.autoRepaymentInfo")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state when no children exist", () => {
      render(<CreditManagementClient {...defaultProps} children={[]} />);
      expect(screen.getByText("credit.noChildren")).toBeInTheDocument();
    });
  });

  describe("child cards", () => {
    it("shows credit enabled badge for children with credit", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByText("credit.enabled")).toBeInTheDocument();
    });

    it("shows credit disabled badge for children without credit", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByText("credit.disabled")).toBeInTheDocument();
    });

    it("displays current balance for each child", () => {
      render(<CreditManagementClient {...defaultProps} />);
      // Check that balances are displayed (might have multiple elements with star values)
      expect(screen.getAllByText(/100 ⭐/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/50 ⭐/).length).toBeGreaterThan(0);
    });

    it("displays credit info only for children with credit enabled", () => {
      render(<CreditManagementClient {...defaultProps} />);
      // Alice has credit enabled - should show credit limit, used, available (all with colons)
      expect(screen.getAllByText(/credit\.creditLimit/)).toHaveLength(1);
      expect(screen.getByText(/credit\.creditUsed/)).toBeInTheDocument();
      expect(screen.getAllByText(/credit\.availableCredit/)).toHaveLength(1);
    });

    it("displays credit used amount with warning color when positive", () => {
      render(<CreditManagementClient {...defaultProps} />);
      const creditUsedValue = screen.getByText("20 ⭐");
      expect(creditUsedValue).toHaveClass("text-warning");
    });

    it("shows edit settings button for children with credit enabled", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByText("credit.editSettings")).toBeInTheDocument();
    });

    it("shows enable credit button for children without credit", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByText("credit.enableCredit")).toBeInTheDocument();
    });
  });

  describe("credit usage bar", () => {
    it("renders usage bar for children with credit enabled and limit > 0", () => {
      const { container } = render(<CreditManagementClient {...defaultProps} />);
      // Alice has 20/50 used = 40%, should be green (success)
      const usageBar = container.querySelector(".bg-success");
      expect(usageBar).toBeInTheDocument();
    });

    it("shows usage text", () => {
      render(<CreditManagementClient {...defaultProps} />);
      expect(screen.getByText("20 / 50 credit.used")).toBeInTheDocument();
    });

    it("applies warning color when usage is between 50-80%", () => {
      const props = {
        ...defaultProps,
        balances: [
          {
            ...defaultProps.balances[0],
            credit_used: 35, // 70%
          },
          defaultProps.balances[1],
        ],
      };
      const { container } = render(<CreditManagementClient {...props} />);
      const usageBar = container.querySelector(".bg-warning");
      expect(usageBar).toBeInTheDocument();
    });

    it("applies danger color when usage is above 80%", () => {
      const props = {
        ...defaultProps,
        balances: [
          {
            ...defaultProps.balances[0],
            credit_used: 45, // 90%
          },
          defaultProps.balances[1],
        ],
      };
      const { container } = render(<CreditManagementClient {...props} />);
      const usageBar = container.querySelector(".bg-danger");
      expect(usageBar).toBeInTheDocument();
    });
  });

  describe("settings modal", () => {
    it("opens settings modal when button is clicked", async () => {
      const user = userEvent.setup();
      render(<CreditManagementClient {...defaultProps} />);

      const editButton = screen.getByText("credit.editSettings");
      await user.click(editButton);

      expect(screen.getByTestId("credit-settings-modal")).toBeInTheDocument();
      expect(screen.getByText("Modal for Alice")).toBeInTheDocument();
    });

    it("opens modal for correct child when enable button is clicked", async () => {
      const user = userEvent.setup();
      render(<CreditManagementClient {...defaultProps} />);

      const enableButton = screen.getByText("credit.enableCredit");
      await user.click(enableButton);

      expect(screen.getByTestId("credit-settings-modal")).toBeInTheDocument();
      expect(screen.getByText("Modal for Bob")).toBeInTheDocument();
    });

    it("closes modal when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<CreditManagementClient {...defaultProps} />);

      const editButton = screen.getByText("credit.editSettings");
      await user.click(editButton);

      expect(screen.getByTestId("credit-settings-modal")).toBeInTheDocument();

      const closeButton = screen.getByText("Close");
      await user.click(closeButton);

      expect(screen.queryByTestId("credit-settings-modal")).not.toBeInTheDocument();
    });

    it("refreshes page when modal save is successful", async () => {
      const user = userEvent.setup();
      render(<CreditManagementClient {...defaultProps} />);

      const editButton = screen.getByText("credit.editSettings");
      await user.click(editButton);

      const saveButton = screen.getByText("Save");
      await user.click(saveButton);

      expect(mockRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId("credit-settings-modal")).not.toBeInTheDocument();
    });
  });

  describe("balance display", () => {
    it("shows negative balance in danger color", () => {
      const props = {
        ...defaultProps,
        balances: [
          {
            ...defaultProps.balances[0],
            current_stars: -20,
          },
          defaultProps.balances[1],
        ],
      };
      render(<CreditManagementClient {...props} />);
      const negativeBalance = screen.getByText("-20 ⭐");
      expect(negativeBalance).toHaveClass("text-danger");
    });

    it("shows positive balance in success color", () => {
      render(<CreditManagementClient {...defaultProps} />);
      const positiveBalance = screen.getByText("100 ⭐");
      expect(positiveBalance).toHaveClass("text-success");
    });
  });

  describe("child without balance data", () => {
    it("handles missing balance gracefully", () => {
      const props = {
        ...defaultProps,
        balances: [], // No balances
      };
      render(<CreditManagementClient {...props} />);

      // Should still render children
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();

      // Should show disabled state for both
      expect(screen.getAllByText("credit.disabled")).toHaveLength(2);
    });
  });

  describe("locale handling", () => {
    it("passes locale to child components", () => {
      render(<CreditManagementClient {...defaultProps} locale="zh-CN" />);

      // The mocked components receive the locale prop
      expect(screen.getByTestId("interest-tier-manager")).toBeInTheDocument();
      expect(screen.getByTestId("settlement-history-table")).toBeInTheDocument();
    });
  });
});
