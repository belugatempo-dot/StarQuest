import { render, screen } from "@testing-library/react";
import PerChildStatCards from "@/components/shared/PerChildStatCards";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("PerChildStatCards", () => {
  const lucasPositive = {
    childId: "child-1",
    childName: "Lucas",
    childAvatar: "👦",
    currentStars: 217,
    spendableStars: 517,
    creditEnabled: true,
    creditLimit: 300,
    creditUsed: 0,
    availableCredit: 300,
    totalEarned: 2100,
    totalDeducted: -200,
    totalRedeemed: 1683,
  };

  const emmaInDebt = {
    childId: "child-2",
    childName: "Emma",
    childAvatar: "👧",
    currentStars: -50,
    spendableStars: 150,
    creditEnabled: true,
    creditLimit: 200,
    creditUsed: 50,
    availableCredit: 150,
    totalEarned: 500,
    totalDeducted: -30,
    totalRedeemed: 520,
  };

  it("renders child name and avatar", () => {
    render(<PerChildStatCards locale="en" childStats={[lucasPositive]} />);
    expect(screen.getByText("Lucas")).toBeInTheDocument();
    expect(screen.getByText("👦")).toBeInTheDocument();
  });

  it("shows current stars for positive balance", () => {
    render(<PerChildStatCards locale="en" childStats={[lucasPositive]} />);
    expect(screen.getByText("217")).toBeInTheDocument();
  });

  it("shows credit limit when balance is positive", () => {
    render(<PerChildStatCards locale="en" childStats={[lucasPositive]} />);
    expect(screen.getByText(/Credit Limit/)).toBeInTheDocument();
  });

  it("shows debt when balance is negative", () => {
    render(<PerChildStatCards locale="en" childStats={[emmaInDebt]} />);
    expect(screen.getByText(/Debt/)).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("shows remaining credit when in debt", () => {
    render(<PerChildStatCards locale="en" childStats={[emmaInDebt]} />);
    expect(screen.getByText(/Remaining Credit/)).toBeInTheDocument();
    expect(screen.getAllByText("150")).toHaveLength(2); // remaining credit + spendable
  });

  it("shows spendable stars", () => {
    render(<PerChildStatCards locale="en" childStats={[lucasPositive]} />);
    expect(screen.getByText(/Can Spend/)).toBeInTheDocument();
    expect(screen.getByText("517")).toBeInTheDocument();
  });

  it("does not show credit section when credit disabled", () => {
    const noCredit = {
      ...lucasPositive,
      creditEnabled: false,
      creditLimit: 0,
      availableCredit: 0,
      spendableStars: 217,
    };
    render(<PerChildStatCards locale="en" childStats={[noCredit]} />);
    expect(screen.queryByText(/Credit Limit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Debt/)).not.toBeInTheDocument();
  });

  it("renders multiple children separately", () => {
    render(
      <PerChildStatCards
        locale="en"
        childStats={[lucasPositive, emmaInDebt]}
      />
    );
    expect(screen.getByText("Lucas")).toBeInTheDocument();
    expect(screen.getByText("Emma")).toBeInTheDocument();
  });

  it("renders in Chinese when locale is zh-CN", () => {
    render(<PerChildStatCards locale="zh-CN" childStats={[lucasPositive]} />);
    expect(screen.getByText(/当前星星/)).toBeInTheDocument();
    expect(screen.getByText(/可消费/)).toBeInTheDocument();
  });

  it("returns null when childStats is empty", () => {
    const { container } = render(
      <PerChildStatCards locale="en" childStats={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows earned, deducted, and redeemed stats", () => {
    render(<PerChildStatCards locale="en" childStats={[lucasPositive]} />);
    expect(screen.getByText("+2100")).toBeInTheDocument();
    expect(screen.getByText("-200")).toBeInTheDocument();
    expect(screen.getByText("1683")).toBeInTheDocument();
  });
});
