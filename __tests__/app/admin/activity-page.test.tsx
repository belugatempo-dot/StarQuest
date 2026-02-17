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

jest.mock("@/components/admin/ActivityPageHeader", () => {
  return function MockActivityPageHeader({ locale }: any) {
    return (
      <div data-testid="activity-page-header">
        {locale === "zh-CN" ? "星星日历" : "Star Calendar"}
      </div>
    );
  };
});

jest.mock("@/components/shared/UnifiedActivityList", () => {
  return function MockUnifiedActivityList({ activities, locale, role, rewards, childBalances }: any) {
    return (
      <div data-testid="unified-activity-list">
        UnifiedActivityList - {activities.length} items - {role}
        {rewards && <span data-testid="rewards-count">{rewards.length} rewards</span>}
        {childBalances && <span data-testid="balances-count">{childBalances.length} balances</span>}
      </div>
    );
  };
});

jest.mock("@/lib/activity-utils", () => ({
  transformStarTransaction: jest.fn().mockReturnValue({
    id: "tx-1",
    type: "star",
    date: "2026-01-01",
    stars: 5,
  }),
  transformRedemption: jest.fn().mockReturnValue({
    id: "rd-1",
    type: "redemption",
    date: "2026-01-01",
    stars: -10,
  }),
  sortActivitiesByDate: jest.fn().mockReturnValue([]),
  calculateActivityStats: jest.fn().mockReturnValue({
    totalRecords: 0,
    positiveRecords: 0,
    negativeRecords: 0,
    totalStarsGiven: 0,
    totalStarsDeducted: 0,
    starsRedeemed: 0,
    netStars: 0,
  }),
}));

import ActivityPage from "@/app/[locale]/(parent)/admin/activity/page";

describe("ActivityPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Star Calendar/)).toBeInTheDocument();
  });

  it("renders statistics cards", async () => {
    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Total Records")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByText(/Net Stars/)).toBeInTheDocument();
  });

  it("renders stars redeemed card", async () => {
    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Stars Redeemed/)).toBeInTheDocument();
  });

  it("renders stars redeemed card in Chinese", async () => {
    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText(/星星兑换/)).toBeInTheDocument();
  });

  it("renders credit borrowed card", async () => {
    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Credit Borrowed/)).toBeInTheDocument();
  });

  it("renders unified activity list", async () => {
    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("unified-activity-list")).toBeInTheDocument();
  });

  it("renders zh-CN header for zh-CN locale", async () => {
    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText(/星星日历/)).toBeInTheDocument();
  });

  it("renders zh-CN stat labels for zh-CN locale", async () => {
    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("总记录")).toBeInTheDocument();
    expect(screen.getByText("加分记录")).toBeInTheDocument();
    expect(screen.getByText("扣分记录")).toBeInTheDocument();
    expect(screen.getByText(/信用借用/)).toBeInTheDocument();
    expect(screen.getByText(/净值/)).toBeInTheDocument();
  });
});

describe("ActivityPage with data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("transforms and passes transaction data to activity list", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const { transformStarTransaction, sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockTx = { id: "tx-1", stars: 5, created_at: "2026-01-01", quest: { name_en: "Homework" } };
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: [mockTx], error: null });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "credit_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });

    transformStarTransaction.mockReturnValue({
      id: "tx-1",
      type: "star",
      date: "2026-01-01",
      stars: 5,
    });
    sortActivitiesByDate.mockImplementation((items: any[]) => items);

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(transformStarTransaction).toHaveBeenCalledWith(mockTx, true);
    expect(screen.getByTestId("unified-activity-list")).toHaveTextContent("1 items");
  });

  it("transforms and passes redemption data to activity list", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const { transformRedemption, sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockRd = { id: "rd-1", stars_spent: 10, created_at: "2026-01-01", reward: { name_en: "Ice Cream" } };
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: [mockRd], error: null });
      }
      if (table === "credit_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });

    transformRedemption.mockReturnValue({
      id: "rd-1",
      type: "redemption",
      date: "2026-01-01",
      stars: -10,
    });
    sortActivitiesByDate.mockImplementation((items: any[]) => items);

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(transformRedemption).toHaveBeenCalledWith(mockRd, true);
    expect(screen.getByTestId("unified-activity-list")).toHaveTextContent("1 items");
  });

  it("logs error when star_transactions query fails", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: null, error: { message: "DB error" } });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "credit_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching transactions:",
      { message: "DB error" }
    );
    consoleSpy.mockRestore();
  });

  it("logs error when redemptions query fails", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: null, error: { message: "Redemption DB error" } });
      }
      if (table === "credit_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching redemptions:",
      { message: "Redemption DB error" }
    );
    consoleSpy.mockRestore();
  });

  it("logs error when credit_transactions query fails", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "credit_transactions") {
        return buildChainMock({ data: null, error: { message: "Credit DB error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching credit transactions:",
      { message: "Credit DB error" }
    );
    consoleSpy.mockRestore();
  });

  it("calculates total credit borrowed from credit_used transactions", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const { calculateActivityStats, sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "credit_transactions") {
        return buildChainMock({
          data: [
            { id: "ct-1", transaction_type: "credit_used", amount: 15 },
            { id: "ct-2", transaction_type: "credit_used", amount: 10 },
            { id: "ct-3", transaction_type: "repayment", amount: 5 },
          ],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });
    sortActivitiesByDate.mockReturnValue([]);
    calculateActivityStats.mockReturnValue({
      totalRecords: 0,
      positiveRecords: 0,
      negativeRecords: 0,
      totalStarsGiven: 0,
      totalStarsDeducted: 0,
      netStars: 0,
    });

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // 15 + 10 = 25 (only credit_used, not repayment)
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("displays stats with negative net stars", async () => {
    const { calculateActivityStats, sortActivitiesByDate } = require("@/lib/activity-utils");

    sortActivitiesByDate.mockReturnValue([]);
    calculateActivityStats.mockReturnValue({
      totalRecords: 5,
      positiveRecords: 1,
      negativeRecords: 4,
      totalStarsGiven: 10,
      totalStarsDeducted: -30,
      starsRedeemed: 0,
      netStars: -20,
    });

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Negative net stars should display without "+" prefix
    expect(screen.getByText("-20")).toBeInTheDocument();
  });

  it("displays stats with positive net stars", async () => {
    const { calculateActivityStats, sortActivitiesByDate } = require("@/lib/activity-utils");

    sortActivitiesByDate.mockReturnValue([]);
    calculateActivityStats.mockReturnValue({
      totalRecords: 10,
      positiveRecords: 7,
      negativeRecords: 3,
      totalStarsGiven: 50,
      totalStarsDeducted: -15,
      starsRedeemed: 0,
      netStars: 35,
    });

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("+50")).toBeInTheDocument();
    expect(screen.getByText("-15")).toBeInTheDocument();
    expect(screen.getByText("+35")).toBeInTheDocument();
  });

  it("fetches and passes rewards and child balances to UnifiedActivityList", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const { sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockRewards = [
      { id: "r1", name_en: "Ice Cream", stars_cost: 10, is_active: true },
    ];
    const mockBalances = [
      { child_id: "c1", current_stars: 50, spendable_stars: 60 },
    ];

    const supabaseFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "rewards") {
        return buildChainMock({ data: mockRewards, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: supabaseFrom });

    const adminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "child_balances") {
        return buildChainMock({ data: mockBalances, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: adminFrom });

    sortActivitiesByDate.mockReturnValue([]);

    const jsx = await ActivityPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("rewards-count")).toHaveTextContent("1 rewards");
    expect(screen.getByTestId("balances-count")).toHaveTextContent("1 balances");
  });
});
