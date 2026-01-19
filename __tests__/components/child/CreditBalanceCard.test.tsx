import React from "react";
import { render, screen } from "@testing-library/react";
import CreditBalanceCard from "@/components/child/CreditBalanceCard";
import type { ChildBalanceWithCredit } from "@/types/credit";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("CreditBalanceCard", () => {
  const createMockBalance = (
    overrides: Partial<ChildBalanceWithCredit> = {}
  ): ChildBalanceWithCredit => ({
    child_id: "child-1",
    family_id: "family-1",
    name: "Test Child",
    current_stars: 100,
    lifetime_stars: 500,
    credit_enabled: true,
    credit_limit: 50,
    original_credit_limit: 50,
    credit_used: 0,
    available_credit: 50,
    spendable_stars: 150,
    ...overrides,
  });

  describe("rendering", () => {
    it("returns null when credit is disabled", () => {
      const balance = createMockBalance({ credit_enabled: false });
      const { container } = render(
        <CreditBalanceCard balance={balance} locale="en" />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders when credit is enabled", () => {
      const balance = createMockBalance({ credit_enabled: true });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText("credit.creditAccount")).toBeInTheDocument();
    });

    it("shows credit account title with icon", () => {
      const balance = createMockBalance();
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText("💳")).toBeInTheDocument();
      expect(screen.getByText("credit.creditAccount")).toBeInTheDocument();
    });
  });

  describe("balance display", () => {
    it("shows positive balance in success color", () => {
      const balance = createMockBalance({ current_stars: 100 });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      const balanceElement = screen.getByText("100 ⭐");
      expect(balanceElement).toHaveClass("text-success");
    });

    it("shows negative balance in danger color", () => {
      const balance = createMockBalance({ current_stars: -20 });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      const balanceElement = screen.getByText("-20 ⭐");
      expect(balanceElement).toHaveClass("text-danger");
    });

    it("shows spendable stars", () => {
      const balance = createMockBalance({ spendable_stars: 150 });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText("150 ⭐")).toBeInTheDocument();
    });
  });

  describe("debt display", () => {
    it("shows debt badge when child has debt", () => {
      const balance = createMockBalance({
        current_stars: -20,
        credit_used: 20,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText("credit.hasDebt")).toBeInTheDocument();
    });

    it("does not show debt badge when child has no debt", () => {
      const balance = createMockBalance({
        current_stars: 100,
        credit_used: 0,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.queryByText("credit.hasDebt")).not.toBeInTheDocument();
    });

    it("shows debt amount when child owes stars", () => {
      const balance = createMockBalance({
        current_stars: -30,
        credit_used: 30,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText(/credit\.youOwe/)).toBeInTheDocument();
      // Find the debt amount display
      const debtDisplay = screen.getAllByText(/30/);
      expect(debtDisplay.length).toBeGreaterThan(0);
    });

    it("shows credit limit when child has debt", () => {
      const balance = createMockBalance({
        current_stars: -20,
        credit_used: 20,
        credit_limit: 50,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText(/credit\.creditLimit/)).toBeInTheDocument();
    });
  });

  describe("credit usage bar", () => {
    it("shows usage bar when child has debt and credit limit > 0", () => {
      const balance = createMockBalance({
        current_stars: -20,
        credit_used: 20,
        credit_limit: 50,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText("20 / 50 credit.used")).toBeInTheDocument();
    });

    it("applies danger color when usage is above 80%", () => {
      const balance = createMockBalance({
        current_stars: -45,
        credit_used: 45,
        credit_limit: 50,
      });
      const { container } = render(
        <CreditBalanceCard balance={balance} locale="en" />
      );
      const usageBar = container.querySelector(".bg-danger");
      expect(usageBar).toBeInTheDocument();
    });

    it("applies warning color when usage is between 50-80%", () => {
      const balance = createMockBalance({
        current_stars: -30,
        credit_used: 30,
        credit_limit: 50,
      });
      const { container } = render(
        <CreditBalanceCard balance={balance} locale="en" />
      );
      const usageBar = container.querySelector(".bg-warning");
      expect(usageBar).toBeInTheDocument();
    });

    it("applies success color when usage is below 50%", () => {
      const balance = createMockBalance({
        current_stars: -10,
        credit_used: 10,
        credit_limit: 50,
      });
      const { container } = render(
        <CreditBalanceCard balance={balance} locale="en" />
      );
      const usageBar = container.querySelector(".bg-success");
      expect(usageBar).toBeInTheDocument();
    });
  });

  describe("available credit", () => {
    it("shows available credit when child has no debt", () => {
      const balance = createMockBalance({
        current_stars: 100,
        credit_used: 0,
        available_credit: 50,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText(/credit\.availableCredit/)).toBeInTheDocument();
    });

    it("does not show available credit section when credit is fully used", () => {
      const balance = createMockBalance({
        current_stars: -50,
        credit_used: 50,
        available_credit: 0,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      // When credit is fully used (hasDebt=true, available_credit=0), the available credit section should not render
      expect(screen.queryByText(/credit\.availableCredit/)).not.toBeInTheDocument();
    });
  });

  describe("info messages", () => {
    it("shows repayment info when child has debt", () => {
      const balance = createMockBalance({
        current_stars: -20,
        credit_used: 20,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText(/credit.debtRepaymentInfo/)).toBeInTheDocument();
    });

    it("does not show repayment info when child has no debt", () => {
      const balance = createMockBalance({
        current_stars: 100,
        credit_used: 0,
      });
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.queryByText(/credit.debtRepaymentInfo/)).not.toBeInTheDocument();
    });
  });

  describe("locale support", () => {
    it("renders correctly with en locale", () => {
      const balance = createMockBalance();
      render(<CreditBalanceCard balance={balance} locale="en" />);
      expect(screen.getByText("credit.creditAccount")).toBeInTheDocument();
    });

    it("renders correctly with zh-CN locale", () => {
      const balance = createMockBalance();
      render(<CreditBalanceCard balance={balance} locale="zh-CN" />);
      expect(screen.getByText("credit.creditAccount")).toBeInTheDocument();
    });
  });
});
