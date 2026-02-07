import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreditSettingsModal from "@/components/admin/CreditSettingsModal";
import type { ChildBalanceWithCredit } from "@/types/credit";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFromEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockFromSelect = jest.fn().mockReturnValue({ eq: mockFromEq });
const mockSupabase = {
  from: jest.fn().mockReturnValue({ select: mockFromSelect }),
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

// Mock typed helpers
const mockTypedUpdateEq = jest.fn();
const mockTypedUpdate = jest.fn(() => ({ eq: mockTypedUpdateEq }));
const mockTypedInsert = jest.fn();

jest.mock("@/lib/supabase/helpers", () => ({
  typedUpdate: (...args: any[]) => mockTypedUpdate(...args),
  typedInsert: (...args: any[]) => mockTypedInsert(...args),
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
    // Restore default mock chain for supabase.from().select().eq().maybeSingle()
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockFromEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockFromSelect.mockReturnValue({ eq: mockFromEq });
    mockSupabase.from.mockReturnValue({ select: mockFromSelect });
    // Restore default mock for typed helpers
    mockTypedUpdateEq.mockResolvedValue({ error: null });
    mockTypedUpdate.mockReturnValue({ eq: mockTypedUpdateEq });
    mockTypedInsert.mockResolvedValue({ error: null });
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
      // Setup mock to hang - never-resolving promise
      mockMaybeSingle.mockReturnValue(new Promise(() => {}));

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

  describe("handleSubmit - update path", () => {
    it("calls typedUpdate when existing settings found", async () => {
      // Mock: existing settings found
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "settings-1" }, error: null });
      // Mock: typedUpdate succeeds
      mockTypedUpdateEq.mockResolvedValueOnce({ error: null });

      const onSuccess = jest.fn();
      render(
        <CreditSettingsModal {...defaultProps} onSuccess={onSuccess} />
      );

      // Enable credit and set limit
      const toggle = screen.getByRole("checkbox");
      fireEvent.click(toggle);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "100" } });

      // Submit form
      const saveButton = screen.getByText("common.save");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalledWith(
          mockSupabase,
          "child_credit_settings",
          expect.objectContaining({
            credit_enabled: true,
            credit_limit: 100,
            original_credit_limit: 100,
          })
        );
      });

      await waitFor(() => {
        expect(mockTypedUpdateEq).toHaveBeenCalledWith("child_id", "child-1");
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("sets original_credit_limit to 0 when credit disabled on update", async () => {
      // Mock: existing settings found
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "settings-1" }, error: null });
      // Mock: typedUpdate succeeds
      mockTypedUpdateEq.mockResolvedValueOnce({ error: null });

      const balanceWithCredit: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
        credit_limit: 50,
      };

      render(
        <CreditSettingsModal
          {...defaultProps}
          balance={balanceWithCredit}
        />
      );

      // Disable credit
      const toggle = screen.getByRole("checkbox");
      fireEvent.click(toggle);

      // Submit form
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalledWith(
          mockSupabase,
          "child_credit_settings",
          expect.objectContaining({
            credit_enabled: false,
            original_credit_limit: 0,
          })
        );
      });
    });

    it("shows error when typedUpdate returns an error", async () => {
      // Mock: existing settings found
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "settings-1" }, error: null });
      // Mock: typedUpdate returns error
      mockTypedUpdateEq.mockResolvedValueOnce({ error: new Error("Update failed") });

      const onSuccess = jest.fn();
      render(
        <CreditSettingsModal {...defaultProps} onSuccess={onSuccess} />
      );

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Update failed")).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("handleSubmit - insert path", () => {
    it("calls typedInsert when no existing settings found", async () => {
      // Mock: no existing settings
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // Mock: typedInsert succeeds
      mockTypedInsert.mockResolvedValueOnce({ error: null });

      const onSuccess = jest.fn();
      render(
        <CreditSettingsModal {...defaultProps} onSuccess={onSuccess} />
      );

      // Enable credit and set limit
      const toggle = screen.getByRole("checkbox");
      fireEvent.click(toggle);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "75" } });

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledWith(
          mockSupabase,
          "child_credit_settings",
          expect.objectContaining({
            family_id: "family-1",
            child_id: "child-1",
            credit_enabled: true,
            credit_limit: 75,
            original_credit_limit: 75,
          })
        );
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("sets original_credit_limit to 0 when credit disabled on insert", async () => {
      // Mock: no existing settings
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // Mock: typedInsert succeeds
      mockTypedInsert.mockResolvedValueOnce({ error: null });

      render(<CreditSettingsModal {...defaultProps} />);

      // Credit is already disabled, just submit
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledWith(
          mockSupabase,
          "child_credit_settings",
          expect.objectContaining({
            credit_enabled: false,
            original_credit_limit: 0,
          })
        );
      });
    });

    it("shows error when typedInsert returns an error", async () => {
      // Mock: no existing settings
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // Mock: typedInsert returns error
      mockTypedInsert.mockResolvedValueOnce({ error: new Error("Insert failed") });

      const onSuccess = jest.fn();
      render(
        <CreditSettingsModal {...defaultProps} onSuccess={onSuccess} />
      );

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Insert failed")).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("handleSubmit - error handling", () => {
    it("handles non-Error object in catch block", async () => {
      // Mock: existence check throws a non-Error object
      mockMaybeSingle.mockRejectedValueOnce("string error");

      const onSuccess = jest.fn();
      render(
        <CreditSettingsModal {...defaultProps} onSuccess={onSuccess} />
      );

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        // Should use the t("credit.saveError") fallback since the thrown value is not an Error instance
        expect(screen.getByText("credit.saveError")).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("handles Error object in catch block", async () => {
      // Mock: existence check throws an Error
      mockMaybeSingle.mockRejectedValueOnce(new Error("Network error"));

      const onSuccess = jest.fn();
      render(
        <CreditSettingsModal {...defaultProps} onSuccess={onSuccess} />
      );

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("re-enables save button after error", async () => {
      // Mock: existence check throws
      mockMaybeSingle.mockRejectedValueOnce(new Error("Failed"));

      render(<CreditSettingsModal {...defaultProps} />);

      const saveButton = screen.getByText("common.save");
      fireEvent.click(saveButton);

      // Wait for error to appear and loading to finish
      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });

      // Save button should be re-enabled (loading = false via finally)
      await waitFor(() => {
        expect(screen.getByText("common.save")).not.toBeDisabled();
      });
    });
  });

  describe("Branch coverage", () => {
    it("shows warning when credit limit prop is initially below current debt", () => {
      // Render with credit_limit already below credit_used from the initial balance
      const balanceWithLimitBelowDebt: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
        credit_limit: 10,
        credit_used: 30,
        current_stars: -20,
      };
      render(
        <CreditSettingsModal {...defaultProps} balance={balanceWithLimitBelowDebt} />
      );

      // The warning should appear immediately since credit_limit (10) < credit_used (30)
      expect(screen.getByText("credit.limitBelowDebtWarning")).toBeInTheDocument();
    });
  });

  describe("limit below debt warning", () => {
    it("shows warning when credit enabled and limit is below current debt", () => {
      const balanceWithDebt: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
        credit_limit: 50,
        credit_used: 30,
        current_stars: -10,
      };
      render(
        <CreditSettingsModal {...defaultProps} balance={balanceWithDebt} />
      );

      // Set credit limit below the current debt (30)
      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "20" } });

      expect(screen.getByText("credit.limitBelowDebtWarning")).toBeInTheDocument();
    });

    it("does not show warning when limit is above current debt", () => {
      const balanceWithDebt: ChildBalanceWithCredit = {
        ...mockBalance,
        credit_enabled: true,
        credit_limit: 50,
        credit_used: 30,
        current_stars: -10,
      };
      render(
        <CreditSettingsModal {...defaultProps} balance={balanceWithDebt} />
      );

      // Limit (50) is already above debt (30), no warning
      expect(screen.queryByText("credit.limitBelowDebtWarning")).not.toBeInTheDocument();
    });
  });
});
