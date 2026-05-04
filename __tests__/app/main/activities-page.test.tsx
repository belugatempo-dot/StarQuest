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
  return function MockUnifiedActivityList({ activities, locale, role, rewards, childBalances, pendingStarRequests, pendingRedemptionRequests }: any) {
    return (
      <div data-testid="unified-activity-list">
        UnifiedActivityList - {activities.length} items - {role}
        {rewards && <span data-testid="rewards-count">{rewards.length} rewards</span>}
        {childBalances && <span data-testid="balances-count">{childBalances.length} balances</span>}
        {pendingStarRequests && <span data-testid="pending-stars-count">{pendingStarRequests.length} pending stars</span>}
        {pendingRedemptionRequests && <span data-testid="pending-redemptions-count">{pendingRedemptionRequests.length} pending redemptions</span>}
      </div>
    );
  };
});

jest.mock("@/components/shared/PerChildStatCards", () => {
  return function MockPerChildStatCards(props: any) {
    return (
      <div data-testid="per-child-stats">
        <span data-testid="stat-locale">{props.locale}</span>
        {(props.childStats || []).map((child: any) => (
          <div key={child.childId} data-testid={`child-stat-${child.childId}`}>
            <span data-testid="child-name">{child.childName}</span>
            <span data-testid="current-stars">{child.currentStars}</span>
            <span data-testid="spendable-stars">{child.spendableStars}</span>
            <span data-testid="credit-used">{child.creditUsed}</span>
          </div>
        ))}
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
}));

import ActivitiesPage from "@/app/[locale]/(main)/activities/page";

// ---- Parent View Tests ----

describe("ActivitiesPage — Parent View", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      name: "Jane",
      role: "parent",
      family_id: "fam-1",
    });
  });

  it("renders page header for parent", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Star Calendar/)).toBeInTheDocument();
  });

  it("renders PerChildStatCards with locale", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("per-child-stats")).toBeInTheDocument();
    expect(screen.getByTestId("stat-locale")).toHaveTextContent("en");
  });

  it("renders unified activity list with parent role", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const list = screen.getByTestId("unified-activity-list");
    expect(list).toBeInTheDocument();
    expect(list).toHaveTextContent("parent");
  });

  it("renders zh-CN header for zh-CN locale", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText(/星星日历/)).toBeInTheDocument();
  });

  it("passes zh-CN locale to PerChildStatCards", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByTestId("stat-locale")).toHaveTextContent("zh-CN");
  });

  it("transforms and passes transaction data to activity list", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const { transformStarTransaction, sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockTx = { id: "tx-1", stars: 5, created_at: "2026-01-01", quest: { name_en: "Homework" } };
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: [mockTx], error: null });
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

    const jsx = await ActivitiesPage({
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
      if (table === "redemptions") {
        return buildChainMock({ data: [mockRd], error: null });
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

    const jsx = await ActivitiesPage({
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
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });

    const jsx = await ActivitiesPage({
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
      if (table === "redemptions") {
        return buildChainMock({ data: null, error: { message: "Redemption DB error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });

    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching redemptions:",
      { message: "Redemption DB error" }
    );
    consoleSpy.mockRestore();
  });


  it("builds per-child stats from balances and activities", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const { sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "child_balances") {
        return buildChainMock({
          data: [
            {
              child_id: "child-1",
              current_stars: -30,
              spendable_stars: 70,
              credit_used: 30,
              credit_enabled: true,
              credit_limit: 100,
              available_credit: 70,
            },
          ],
          error: null,
        });
      }
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "child-1", name: "Lucas", avatar_url: "👦", role: "child" },
          ],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValue({ from: mockFrom });
    sortActivitiesByDate.mockReturnValue([]);

    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("per-child-stats")).toBeInTheDocument();
    expect(screen.getByTestId("child-stat-child-1")).toBeInTheDocument();
    expect(screen.getByTestId("current-stars")).toHaveTextContent("-30");
    expect(screen.getByTestId("credit-used")).toHaveTextContent("30");
  });

  it("passes pending approval data to UnifiedActivityList", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const { sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockPendingStars = [{ id: "ps-1", status: "pending" }, { id: "ps-2", status: "pending" }];
    const mockPendingRedemptions = [{ id: "pr-1", status: "pending" }];

    const supabaseFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: mockPendingStars, error: null });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: mockPendingRedemptions, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: supabaseFrom });
    sortActivitiesByDate.mockReturnValue([]);

    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("pending-stars-count")).toHaveTextContent("2 pending stars");
    expect(screen.getByTestId("pending-redemptions-count")).toHaveTextContent("1 pending redemptions");
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

    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("rewards-count")).toHaveTextContent("1 rewards");
    expect(screen.getByTestId("balances-count")).toHaveTextContent("1 balances");
  });
});

// ---- Child View Tests ----

describe("ActivitiesPage — Child View", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "child-1",
      name: "Alice",
      role: "child",
      family_id: "fam-1",
    });
  });

  it("renders child header", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("common.starCalendar")).toBeInTheDocument();
  });

  it("does not render parent stats cards for child", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.queryByText("Total Records")).not.toBeInTheDocument();
    expect(screen.queryByTestId("activity-page-header")).not.toBeInTheDocument();
  });

  it("renders unified activity list with child role", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const list = screen.getByTestId("unified-activity-list");
    expect(list).toBeInTheDocument();
    expect(list).toHaveTextContent("child");
  });

  it("renders description text for en locale", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(
      screen.getByText("Track all your star earnings and deductions")
    ).toBeInTheDocument();
  });

  it("renders zh-CN description for zh-CN locale", async () => {
    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(
      screen.getByText("查看所有星星的获得和扣除记录")
    ).toBeInTheDocument();
  });

  it("transforms and passes transaction data to activity list", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const { transformStarTransaction, sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockTx = {
      id: "tx-1",
      created_at: "2026-01-15T10:00:00Z",
      stars: 5,
      status: "approved",
      quests: { name_en: "Homework", name_zh: "作业", icon: "📚", category: "study" },
    };

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: [mockTx], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const transformedItem = {
      id: "tx-1",
      type: "star",
      date: "2026-01-15",
      stars: 5,
    };
    transformStarTransaction.mockReturnValue(transformedItem);
    sortActivitiesByDate.mockImplementation((items: any[]) => items);

    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(transformStarTransaction).toHaveBeenCalledWith(mockTx, false);
    expect(screen.getByTestId("unified-activity-list")).toHaveTextContent("1 items");
  });

  it("passes multiple transactions to activity list", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const { transformStarTransaction, sortActivitiesByDate } = require("@/lib/activity-utils");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({
          data: [
            { id: "tx-1", stars: 5 },
            { id: "tx-2", stars: -3 },
            { id: "tx-3", stars: 10 },
          ],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    let callCount = 0;
    transformStarTransaction.mockImplementation(() => ({
      id: `item-${++callCount}`,
      type: "star",
      date: "2026-01-15",
      stars: 5,
    }));
    sortActivitiesByDate.mockImplementation((items: any[]) => items);

    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(transformStarTransaction).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId("unified-activity-list")).toHaveTextContent("3 items");
  });

  it("logs error when transaction fetch fails", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: null, error: { message: "DB error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching transactions:",
      { message: "DB error" }
    );
    consoleSpy.mockRestore();
  });

  it("renders empty activity list when transactions error returns null data", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const { sortActivitiesByDate } = require("@/lib/activity-utils");
    jest.spyOn(console, "error").mockImplementation(() => {});

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({ data: null, error: { message: "error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });
    sortActivitiesByDate.mockReturnValue([]);

    const jsx = await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("unified-activity-list")).toHaveTextContent("0 items");
  });
});
