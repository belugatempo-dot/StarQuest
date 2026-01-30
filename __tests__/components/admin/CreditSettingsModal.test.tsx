import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreditSettingsModal from "@/components/admin/CreditSettingsModal";
import type { ChildBalanceWithCredit } from "@/types/credit";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
    insert: jest.fn(() => Promise.resolve({ error: null })),
  })),
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

describe("CreditSettingsModal", () => {
  const mockChild = {
    id: "child-1",
    name: "Test Child",
    family_id: "family-1",
  };

  const mockBalance: ChildBalanceWithCredit = {
    child_id: "child-1",
    family_id: "family-1",
    name: "Test Child",
    current_stars: 100,
    lifetime_stars: 500,
    credit_enabled: false,
    credit_limit: 0,
    original_credit_limit: 0,
    credit_used: 0,
    available_credit: 0,
    spendable_stars: 100,
  };

  const defaultProps = {
    child: mockChild,
    balance: mockBalance,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders modal with title", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      expect(screen.getByText("credit.settingsTitle")).toBeInTheDocument();
    });

    it("displays child name", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      expect(screen.getByText(/Test Child/)).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      expect(screen.getByText("✕")).toBeInTheDocument();
    });

    it("renders enable credit toggle", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      expect(screen.getByText("credit.enableCredit")).toBeInTheDocument();
    });
  });

  describe("current status display", () => {
    it("shows current balance when balance is provided", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      expect(screen.getByText(/credit\.currentBalance/)).toBeInTheDocument();
    });

    it("shows current debt when child has debt", () => {
      const balanceWithDebt: ChildBalanceWithCredit = {
        ...mockBalance,
        current_stars: -20,
        credit_used: 20,
      };
      render(<CreditSettingsModal {...defaultProps} balance={balanceWithDebt} />);
      expect(screen.getByText(/credit\.currentDebt/)).toBeInTheDocument();
    });

    it("does not show debt section when no debt", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      expect(screen.queryByText("credit.currentDebt")).not.toBeInTheDocument();
    });
  });

  describe("credit toggle", () => {
    it("toggle is unchecked when credit is disabled", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      const toggle = screen.getByRole("checkbox");
      expect(toggle).not.toBeChecked();
    });

    it("toggle is checked when credit is enabled", () => {
      const balanceWithCredit: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
        credit_limit: 50,
      };
      render(<CreditSettingsModal {...defaultProps} balance={balanceWithCredit} />);
      const toggle = screen.getByRole("checkbox");
      expect(toggle).toBeChecked();
    });

    it("shows credit limit input when credit is enabled", () => {
      const balanceWithCredit: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
        credit_limit: 50,
      };
      render(<CreditSettingsModal {...defaultProps} balance={balanceWithCredit} />);
      expect(screen.getByText("credit.creditLimit")).toBeInTheDocument();
    });

    it("hides credit limit input when credit is disabled", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      expect(screen.queryByLabelText("credit-limit")).not.toBeInTheDocument();
    });

    it("toggles credit enabled state when clicked", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      const toggle = screen.getByRole("checkbox");

      expect(toggle).not.toBeChecked();
      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });
  });

  describe("credit limit input", () => {
    it("allows entering credit limit", () => {
      const balanceWithCredit: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
      };
      render(<CreditSettingsModal {...defaultProps} balance={balanceWithCredit} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "100" } });
      expect(input).toHaveValue(100);
    });

    it("prevents negative credit limit", () => {
      const balanceWithCredit: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
      };
      render(<CreditSettingsModal {...defaultProps} balance={balanceWithCredit} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "-10" } });
      expect(input).toHaveValue(0);
    });
  });

  describe("warnings", () => {
    it("shows warning when disabling credit with existing debt", () => {
      const balanceWithDebt: ChildBalanceWithCredit = {
        ...mockBalance,
        current_stars: -20,
        credit_used: 20,
        credit_enabled: true,
      };
      render(<CreditSettingsModal {...defaultProps} balance={balanceWithDebt} />);

      // Disable credit
      const toggle = screen.getByRole("checkbox");
      fireEvent.click(toggle);

      expect(screen.getByText(/credit.disableWithDebtWarning/)).toBeInTheDocument();
    });

    it("shows info about interest when credit is enabled", () => {
      const balanceWithCredit: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
      };
      render(<CreditSettingsModal {...defaultProps} balance={balanceWithCredit} />);
      expect(screen.getByText(/credit.interestInfo/)).toBeInTheDocument();
    });
  });

  describe("form actions", () => {
    it("calls onClose when cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<CreditSettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("common.cancel"));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when X button is clicked", () => {
      const onClose = jest.fn();
      render(<CreditSettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("✕"));
      expect(onClose).toHaveBeenCalled();
    });

    it("shows save button", () => {
      render(<CreditSettingsModal {...defaultProps} />);
      expect(screen.getByText("common.save")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("disables save button while loading", async () => {
      // Setup mock to hang
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => new Promise(() => {})), // Never resolves
          })),
        })),
      });

      render(<CreditSettingsModal {...defaultProps} />);

      const saveButton = screen.getByText("common.save");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe("balance prop sync", () => {
    it("updates state when balance prop changes", () => {
      const { rerender } = render(<CreditSettingsModal {...defaultProps} />);

      // Initially credit is disabled
      expect(screen.getByRole("checkbox")).not.toBeChecked();

      // Update with credit enabled
      const newBalance: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
        credit_limit: 75,
      };
      rerender(<CreditSettingsModal {...defaultProps} balance={newBalance} />);

      expect(screen.getByRole("checkbox")).toBeChecked();
    });
  });
});
