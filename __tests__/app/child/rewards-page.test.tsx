import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn().mockResolvedValue({
    id: "child-1",
    name: "Alice",
    role: "child",
    family_id: "fam-1",
  }),
}));

function buildChainMock(resolvedValue: any = { data: [], error: null }) {
  const chain: any = {};
  const methods = ["select", "eq", "order", "limit", "single", "maybeSingle", "or", "neq", "in", "gte", "lte"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  Object.defineProperty(chain, "then", {
    value: (resolve: any) => resolve(resolvedValue),
    writable: true,
    configurable: true,
  });
  return chain;
}

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    from: jest.fn().mockImplementation(() => buildChainMock({ data: [], error: null })),
  }),
}));

jest.mock("@/components/child/RewardGrid", () => {
  return function MockRewardGrid({
    rewards,
    currentStars,
    spendableStars,
    creditEnabled,
    locale,
    userId,
  }: any) {
    return (
      <div data-testid="reward-grid">
        RewardGrid - {rewards.length} rewards - spendable: {spendableStars} - credit: {String(creditEnabled)}
      </div>
    );
  };
});

jest.mock("@/components/child/ChildRedemptionList", () => {
  return function MockChildRedemptionList({ redemptions, locale }: any) {
    return (
      <div data-testid="child-redemption-list">
        ChildRedemptionList - {redemptions.length} redemptions
      </div>
    );
  };
});

import RewardsPage from "@/app/[locale]/(child)/app/rewards/page";

describe("RewardsPage (Child)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("rewards.title")).toBeInTheDocument();
  });

  it("renders reward grid", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("reward-grid")).toBeInTheDocument();
  });

  it("renders child redemption list", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("child-redemption-list")).toBeInTheDocument();
  });

  it("renders balance display", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // When balance is null, spendable defaults to 0
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("common.stars")).toBeInTheDocument();
  });

  it("renders description text", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(
      screen.getByText("Exchange your stars for awesome rewards!")
    ).toBeInTheDocument();
  });

  it("logs error when reward fetch fails", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockResolvedValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({ data: null, error: { message: "DB error" } })
      ),
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching rewards:",
      { message: "DB error" }
    );
    consoleSpy.mockRestore();
  });

  it("shows credit info when balance has credit enabled", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "child_balances") {
        return buildChainMock({
          data: {
            current_stars: 50,
            spendable_stars: 80,
            credit_enabled: true,
            credit_limit: 50,
            credit_used: 20,
            available_credit: 30,
          },
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValueOnce({ from: mockFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // creditEnabled is true => shows credit.canSpend label
    expect(screen.getByText("credit.canSpend")).toBeInTheDocument();
    // Shows spendable stars
    expect(screen.getByText("80")).toBeInTheDocument();
    // creditEnabled && availableCredit > 0 => shows credit info
    expect(screen.getByText(/credit\.includesCredit/)).toBeInTheDocument();
    // RewardGrid shows credit enabled
    expect(screen.getByTestId("reward-grid")).toHaveTextContent("credit: true");
  });

  it("shows dashboard.currentBalance when credit is disabled", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "child_balances") {
        return buildChainMock({
          data: {
            current_stars: 50,
            spendable_stars: 50,
            credit_enabled: false,
            credit_limit: 0,
            credit_used: 0,
            available_credit: 0,
          },
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValueOnce({ from: mockFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // creditEnabled is false => shows dashboard.currentBalance label
    expect(screen.getByText("dashboard.currentBalance")).toBeInTheDocument();
    // Credit info not shown
    expect(screen.queryByText(/credit\.includesCredit/)).not.toBeInTheDocument();
  });

  it("does not show credit info when credit enabled but availableCredit is 0", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "child_balances") {
        return buildChainMock({
          data: {
            current_stars: 50,
            spendable_stars: 50,
            credit_enabled: true,
            credit_limit: 50,
            credit_used: 50,
            available_credit: 0,
          },
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValueOnce({ from: mockFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // creditEnabled && availableCredit > 0 => false (availableCredit is 0)
    expect(screen.queryByText(/credit\.includesCredit/)).not.toBeInTheDocument();
  });
});
