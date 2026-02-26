import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

const mockRequireAuth = jest.fn();

jest.mock("@/lib/auth", () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
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
  createAdminClient: jest.fn().mockReturnValue({
    from: jest.fn().mockImplementation(() => buildChainMock({ data: [], error: null })),
  }),
}));

jest.mock("@/components/admin/RewardManagement", () => {
  return function MockRewardManagement({ rewards, locale, familyId }: any) {
    return (
      <div data-testid="reward-management">
        RewardManagement - {rewards.length} rewards - {familyId}
      </div>
    );
  };
});

jest.mock("@/components/admin/ParentRedeemSection", () => {
  return function MockParentRedeemSection(props: any) {
    return (
      <div data-testid="parent-redeem-section">
        ParentRedeemSection - {props.locale}
      </div>
    );
  };
});

jest.mock("@/components/child/RewardGrid", () => {
  return function MockRewardGrid({
    rewards,
    spendableStars,
    creditEnabled,
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

import RewardsPage from "@/app/[locale]/(main)/rewards/page";

// ---- Parent View Tests ----

describe("RewardsPage — Parent View", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      name: "Jane",
      role: "parent",
      family_id: "fam-1",
    });
  });

  it("renders page header", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("admin.manageRewards")).toBeInTheDocument();
  });

  it("renders reward management component", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("reward-management")).toBeInTheDocument();
  });

  it("renders parent redeem section", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("parent-redeem-section")).toBeInTheDocument();
  });

  it("renders active and inactive counts", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders zh-CN subtitle", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("管理孩子可以兑换的奖励")).toBeInTheDocument();
    expect(screen.getByText("启用的")).toBeInTheDocument();
    expect(screen.getByText("已停用")).toBeInTheDocument();
  });

  it("displays correct active and inactive reward counts", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({
          data: [
            { id: "r-1", name_en: "Ice Cream", stars_cost: 10, is_active: true },
            { id: "r-2", name_en: "Movie Night", stars_cost: 50, is_active: true },
            { id: "r-3", name_en: "Old Reward", stars_cost: 30, is_active: false },
          ],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const mockAdminFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null })
    );
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("falls back to regular client when admin returns empty children", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const mockAdminFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null })
    );
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [{ id: "c-1", name: "Alice", role: "child" }],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Trying regular client as fallback for children query..."
    );
    expect(consoleSpy).toHaveBeenCalledWith("Found children using regular client:", 1);
    consoleSpy.mockRestore();
  });

  it("logs error when admin client children fetch fails", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: null, error: { message: "Admin error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const mockClientFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null })
    );
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Admin client error fetching children:",
      { message: "Admin error" }
    );
    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("logs error when child_balances fetch fails", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [{ id: "c-1", name: "Alice" }], error: null });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: null, error: { message: "Balances error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const mockClientFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null })
    );
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching child balances:",
      { message: "Balances error" }
    );
    consoleSpy.mockRestore();
  });

  it("handles null rewards data gracefully", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const mockAdminFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null })
    );
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("reward-management")).toHaveTextContent("0 rewards");
  });

  it("logs error and falls back when regular client also fails for children", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const mockAdminFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null })
    );
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: null, error: { message: "Regular error too" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Regular client error fetching children:",
      { message: "Regular error too" }
    );
    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});

// ---- Child View Tests ----

describe("RewardsPage — Child View", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "child-1",
      name: "Alice",
      role: "child",
      family_id: "fam-1",
    });
  });

  it("renders child rewards header", async () => {
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

  it("renders balance display with defaults", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

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

  it("does not render parent components for child", async () => {
    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.queryByTestId("reward-management")).not.toBeInTheDocument();
    expect(screen.queryByTestId("parent-redeem-section")).not.toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("logs error when reward fetch fails", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    createClient.mockResolvedValue({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({ data: null, error: { message: "DB error" } })
      ),
    });

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
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("credit.canSpend")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText(/credit\.includesCredit/)).toBeInTheDocument();
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
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("dashboard.currentBalance")).toBeInTheDocument();
    expect(screen.queryByText(/credit\.includesCredit/)).not.toBeInTheDocument();
  });

  it("does not show credit info when availableCredit is 0", async () => {
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
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await RewardsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.queryByText(/credit\.includesCredit/)).not.toBeInTheDocument();
  });
});
