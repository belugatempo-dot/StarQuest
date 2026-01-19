import React from "react";
import { render, screen } from "@testing-library/react";
import CreditUsageWarning from "@/components/child/CreditUsageWarning";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, any>) => {
    if (params) {
      let result = key;
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
      return result;
    }
    return key;
  },
}));

describe("CreditUsageWarning", () => {
  const defaultProps = {
    creditAmount: 20,
    currentDebt: 0,
    newTotalDebt: 20,
    creditLimit: 50,
    locale: "en",
  };

  describe("rendering", () => {
    it("returns null when credit amount is 0", () => {
      const { container } = render(
        <CreditUsageWarning {...defaultProps} creditAmount={0} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("returns null when credit amount is negative", () => {
      const { container } = render(
        <CreditUsageWarning {...defaultProps} creditAmount={-10} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders warning when credit amount is positive", () => {
      render(<CreditUsageWarning {...defaultProps} />);
      expect(screen.getByText("credit.borrowingWarningTitle")).toBeInTheDocument();
    });

    it("shows warning icon", () => {
      render(<CreditUsageWarning {...defaultProps} />);
      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });
  });

  describe("borrowing information", () => {
    it("shows borrowing message with amount", () => {
      render(<CreditUsageWarning {...defaultProps} creditAmount={25} />);
      expect(screen.getByText(/credit.borrowingWarningMessage/)).toBeInTheDocument();
    });

    it("shows current debt when it exists", () => {
      render(
        <CreditUsageWarning
          {...defaultProps}
          currentDebt={10}
          creditAmount={15}
          newTotalDebt={25}
        />
      );
      expect(screen.getByText(/credit\.currentDebt/)).toBeInTheDocument();
    });

    it("does not show current debt row when debt is 0", () => {
      render(<CreditUsageWarning {...defaultProps} currentDebt={0} />);
      expect(screen.queryByText("credit.currentDebt")).not.toBeInTheDocument();
    });

    it("shows borrowing amount", () => {
      render(<CreditUsageWarning {...defaultProps} creditAmount={20} />);
      expect(screen.getByText(/credit\.borrowing:/)).toBeInTheDocument();
      expect(screen.getByText("+20 ⭐")).toBeInTheDocument();
    });

    it("shows total debt after redemption", () => {
      render(<CreditUsageWarning {...defaultProps} newTotalDebt={35} />);
      expect(screen.getByText(/credit\.totalDebtAfter/)).toBeInTheDocument();
      expect(screen.getByText("35 ⭐")).toBeInTheDocument();
    });
  });

  describe("usage indicator", () => {
    it("shows credit usage label", () => {
      render(<CreditUsageWarning {...defaultProps} />);
      expect(screen.getByText("credit.creditUsage")).toBeInTheDocument();
    });

    it("shows usage ratio", () => {
      render(
        <CreditUsageWarning {...defaultProps} newTotalDebt={25} creditLimit={50} />
      );
      expect(screen.getByText("25 / 50")).toBeInTheDocument();
    });
  });

  describe("color coding based on usage", () => {
    it("applies danger styling when usage > 80%", () => {
      const { container } = render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={45}
          creditLimit={50}
        />
      );
      const dangerBars = container.querySelectorAll(".bg-danger");
      expect(dangerBars.length).toBeGreaterThan(0);
    });

    it("applies warning styling when usage is 50-80%", () => {
      const { container } = render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={35}
          creditLimit={50}
        />
      );
      const warningBars = container.querySelectorAll(".bg-warning");
      expect(warningBars.length).toBeGreaterThan(0);
    });

    it("applies orange styling when usage < 50%", () => {
      const { container } = render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={15}
          creditLimit={50}
        />
      );
      const orangeBars = container.querySelectorAll(".bg-orange-400");
      expect(orangeBars.length).toBeGreaterThan(0);
    });
  });

  describe("warning messages", () => {
    it("always shows interest warning", () => {
      render(<CreditUsageWarning {...defaultProps} />);
      expect(screen.getByText(/credit.interestWarning/)).toBeInTheDocument();
    });

    it("shows high usage warning when usage > 80%", () => {
      render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={45}
          creditLimit={50}
        />
      );
      expect(screen.getByText(/credit.highUsageWarning/)).toBeInTheDocument();
    });

    it("does not show high usage warning when usage <= 80%", () => {
      render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={30}
          creditLimit={50}
        />
      );
      expect(screen.queryByText(/credit.highUsageWarning/)).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles exactly 50% usage", () => {
      const { container } = render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={25}
          creditLimit={50}
        />
      );
      // At exactly 50%, should use orange (not warning)
      const orangeBars = container.querySelectorAll(".bg-orange-400");
      expect(orangeBars.length).toBeGreaterThan(0);
    });

    it("handles exactly 80% usage", () => {
      const { container } = render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={40}
          creditLimit={50}
        />
      );
      // At exactly 80%, should use warning (not danger)
      const warningBars = container.querySelectorAll(".bg-warning");
      expect(warningBars.length).toBeGreaterThan(0);
    });

    it("handles 100% usage", () => {
      const { container } = render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={50}
          creditLimit={50}
        />
      );
      const dangerBars = container.querySelectorAll(".bg-danger");
      expect(dangerBars.length).toBeGreaterThan(0);
    });

    it("handles usage exceeding 100%", () => {
      // This shouldn't normally happen, but let's handle it gracefully
      const { container } = render(
        <CreditUsageWarning
          {...defaultProps}
          newTotalDebt={60}
          creditLimit={50}
        />
      );
      const dangerBars = container.querySelectorAll(".bg-danger");
      expect(dangerBars.length).toBeGreaterThan(0);
    });
  });

  describe("locale support", () => {
    it("renders with en locale", () => {
      render(<CreditUsageWarning {...defaultProps} locale="en" />);
      expect(screen.getByText("credit.borrowingWarningTitle")).toBeInTheDocument();
    });

    it("renders with zh-CN locale", () => {
      render(<CreditUsageWarning {...defaultProps} locale="zh-CN" />);
      expect(screen.getByText("credit.borrowingWarningTitle")).toBeInTheDocument();
    });
  });
});
