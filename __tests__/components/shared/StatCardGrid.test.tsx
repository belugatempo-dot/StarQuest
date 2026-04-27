import { render, screen } from "@testing-library/react";
import StatCardGrid from "@/components/shared/StatCardGrid";

// StatCard is a real component — no need to mock it.
// useTranslations is globally mocked in jest.setup.js to return (key) => key

describe("StatCardGrid", () => {
  const defaultProps = {
    locale: "en",
    totalRecords: 115,
    positiveRecords: 91,
    negativeRecords: 24,
    totalStarsGiven: 1361,
    totalStarsDeducted: -95,
    starsRedeemed: 1683,
    totalCreditBorrowed: 211,
    netStars: -417,
  };

  it("renders all 8 stat cards in English", () => {
    render(<StatCardGrid {...defaultProps} />);
    expect(screen.getByText("Total Records")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByText("Total Stars +")).toBeInTheDocument();
    expect(screen.getByText("Total Stars -")).toBeInTheDocument();
    expect(screen.getByText(/Stars Redeemed/)).toBeInTheDocument();
    expect(screen.getByText(/Credit Borrowed/)).toBeInTheDocument();
    expect(screen.getByText(/Net Stars/)).toBeInTheDocument();
  });

  it("renders all 8 stat cards in Chinese", () => {
    render(<StatCardGrid {...defaultProps} locale="zh-CN" />);
    expect(screen.getByText("总记录")).toBeInTheDocument();
    expect(screen.getByText("加分记录")).toBeInTheDocument();
    expect(screen.getByText("扣分记录")).toBeInTheDocument();
    expect(screen.getByText("总星星+")).toBeInTheDocument();
    expect(screen.getByText("总星星-")).toBeInTheDocument();
    expect(screen.getByText(/星星兑换/)).toBeInTheDocument();
    expect(screen.getByText(/信用借用/)).toBeInTheDocument();
    expect(screen.getByText(/净值/)).toBeInTheDocument();
  });

  it("renders correct values", () => {
    render(<StatCardGrid {...defaultProps} />);
    expect(screen.getByText("115")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("+1361")).toBeInTheDocument();
    expect(screen.getByText("-95")).toBeInTheDocument();
    expect(screen.getByText("1683")).toBeInTheDocument();
    expect(screen.getByText("211")).toBeInTheDocument();
    expect(screen.getByText("-417")).toBeInTheDocument();
  });

  it("shows positive prefix for positive net stars", () => {
    render(<StatCardGrid {...defaultProps} netStars={35} />);
    expect(screen.getByText("+35")).toBeInTheDocument();
  });

  it("renders 8 info icon buttons", () => {
    render(<StatCardGrid {...defaultProps} />);
    const infoBtns = screen.getAllByRole("button", { name: /info/i });
    expect(infoBtns).toHaveLength(8);
  });
});
