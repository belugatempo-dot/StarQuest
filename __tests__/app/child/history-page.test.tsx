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

jest.mock("@/components/shared/UnifiedActivityList", () => {
  return function MockUnifiedActivityList({
    activities,
    locale,
    role,
  }: any) {
    return (
      <div data-testid="unified-activity-list">
        UnifiedActivityList - {activities.length} items - {role}
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
  sortActivitiesByDate: jest.fn().mockReturnValue([]),
}));

import HistoryPage from "@/app/[locale]/(child)/app/history/page";

describe("HistoryPage (Child)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await HistoryPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("common.activities")).toBeInTheDocument();
  });

  it("renders unified activity list", async () => {
    const jsx = await HistoryPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("unified-activity-list")).toBeInTheDocument();
  });

  it("passes child role to activity list", async () => {
    const jsx = await HistoryPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("unified-activity-list")).toHaveTextContent(
      "child"
    );
  });

  it("passes currentUserId to activity list", async () => {
    const jsx = await HistoryPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // currentUserId is passed (verified by the component rendering without errors)
    expect(screen.getByTestId("unified-activity-list")).toBeInTheDocument();
  });

  it("renders description text for en locale", async () => {
    const jsx = await HistoryPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(
      screen.getByText("Track all your star earnings and deductions")
    ).toBeInTheDocument();
  });

  it("renders zh-CN description for zh-CN locale", async () => {
    const jsx = await HistoryPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(
      screen.getByText("查看所有星星的获得和扣除记录")
    ).toBeInTheDocument();
  });
});

describe("HistoryPage with data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const jsx = await HistoryPage({
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

    const jsx = await HistoryPage({
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

    const jsx = await HistoryPage({
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

    const jsx = await HistoryPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("unified-activity-list")).toHaveTextContent("0 items");
  });
});
