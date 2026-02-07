import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

jest.mock("@/lib/auth", () => ({
  requireParent: jest.fn().mockResolvedValue({
    id: "user-1",
    name: "Jane",
    role: "parent",
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

import RewardManagementPage from "@/app/[locale]/(parent)/admin/rewards/page";

describe("RewardManagementPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("admin.manageRewards")).toBeInTheDocument();
  });

  it("renders reward management component", async () => {
    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("reward-management")).toBeInTheDocument();
  });

  it("renders parent redeem section", async () => {
    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("parent-redeem-section")).toBeInTheDocument();
  });

  it("renders active and inactive counts", async () => {
    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders zh-CN subtitle for zh-CN locale", async () => {
    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("管理孩子可以兑换的奖励")).toBeInTheDocument();
  });
});

describe("RewardManagementPage with data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Active count = 2, Inactive count = 1
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("passes rewards and children to child components", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");

    const rewards = [
      { id: "r-1", name_en: "Ice Cream", stars_cost: 10, is_active: true },
    ];
    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({ data: rewards, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [{ id: "c-1", name: "Alice", role: "child" }],
          error: null,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({
          data: [{ child_id: "c-1", current_stars: 20, spendable_stars: 25 }],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("reward-management")).toHaveTextContent("1 rewards");
    expect(screen.getByTestId("parent-redeem-section")).toBeInTheDocument();
  });

  it("falls back to regular client when admin returns empty children", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Admin returns empty for users
    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    // Regular client returns children
    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "users") {
        return buildChainMock({
          data: [{ id: "c-1", name: "Alice", role: "child" }],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await RewardManagementPage({
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
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await RewardManagementPage({
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
        return buildChainMock({
          data: [{ id: "c-1", name: "Alice", role: "child" }],
          error: null,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: null, error: { message: "Balances error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching child balances:",
      { message: "Balances error" }
    );
    consoleSpy.mockRestore();
  });

  it("renders zh-CN labels for zh-CN locale", async () => {
    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("启用的")).toBeInTheDocument();
    expect(screen.getByText("已停用")).toBeInTheDocument();
  });

  it("handles null rewards data gracefully (|| [] fallback)", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");

    // Rewards query returns null data
    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [{ id: "c-1", name: "Alice", role: "child" }],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const jsx = await RewardManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Active and inactive counts should both be 0
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    // Components should still render with empty arrays
    expect(screen.getByTestId("reward-management")).toHaveTextContent("0 rewards");
    expect(screen.getByTestId("parent-redeem-section")).toBeInTheDocument();
  });

  it("logs error and falls back when regular client also fails for children", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Admin returns empty
    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    // Regular client also fails
    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "users") {
        return buildChainMock({ data: null, error: { message: "Regular error too" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await RewardManagementPage({
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
