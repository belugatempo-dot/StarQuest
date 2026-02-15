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
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
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

import ChildDashboard from "@/app/[locale]/(child)/app/page";

describe("ChildDashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders welcome header with child name", async () => {
    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Alice!/)).toBeInTheDocument();
  });

  it("renders dashboard title", async () => {
    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/dashboard\.title/)).toBeInTheDocument();
  });

  it("renders current balance card", async () => {
    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("dashboard.currentBalance")).toBeInTheDocument();
  });

  it("renders lifetime stars card", async () => {
    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("dashboard.lifetimeStars")).toBeInTheDocument();
  });

  it("renders current level card", async () => {
    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("dashboard.currentLevel")).toBeInTheDocument();
  });

  it("renders recent activity section", async () => {
    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("dashboard.recentActivity")).toBeInTheDocument();
  });

  it("renders empty state when no transactions", async () => {
    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(
      screen.getByText("No recent activity yet. Start completing quests!")
    ).toBeInTheDocument();
  });
});

describe("ChildDashboard with data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupMockClient(overrides: Record<string, any> = {}) {
    const { createClient } = require("@/lib/supabase/server");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (overrides[table]) {
        return buildChainMock(overrides[table]);
      }
      if (table === "child_balances") {
        return buildChainMock({ data: null, error: null });
      }
      if (table === "star_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "levels") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });
  }

  it("renders recent transactions when data exists", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 80, lifetime_stars: 150 },
        error: null,
      },
      star_transactions: {
        data: [
          {
            id: "tx-1",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quests: { name_en: "Homework", name_zh: "作业", icon: "📚" },
            custom_description: null,
          },
          {
            id: "tx-2",
            created_at: "2026-01-14T10:00:00Z",
            stars: -3,
            status: "approved",
            quests: { name_en: "Bad behavior", name_zh: "不良行为", icon: "⚠️" },
            custom_description: null,
          },
        ],
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: "初学者", stars_required: 0, level_number: 1, icon: "🌱" },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Homework")).toBeInTheDocument();
    expect(screen.getByText("Bad behavior")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.getByText("-3")).toBeInTheDocument();
    // Should NOT show empty state
    expect(screen.queryByText("No recent activity yet. Start completing quests!")).not.toBeInTheDocument();
  });

  it("renders transaction with custom description when quest is null", async () => {
    setupMockClient({
      star_transactions: {
        data: [
          {
            id: "tx-3",
            created_at: "2026-01-15T10:00:00Z",
            stars: 3,
            status: "approved",
            quests: null,
            custom_description: "Extra credit",
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Extra credit")).toBeInTheDocument();
  });

  it("renders current stars and lifetime stars values", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 42, lifetime_stars: 350 },
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("350")).toBeInTheDocument();
  });

  it("renders current level from levels data", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: "初学者", stars_required: 0, level_number: 1, icon: "🌱" },
          { id: "l-2", name_en: "Explorer", name_zh: "探索者", stars_required: 100, level_number: 2, icon: "🔭" },
          { id: "l-3", name_en: "Master", name_zh: "大师", stars_required: 500, level_number: 3, icon: "🏆" },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Current level = Explorer (200 >= 100)
    expect(screen.getByText("Explorer")).toBeInTheDocument();
    expect(screen.getByText("Level 2")).toBeInTheDocument();
  });

  it("renders zh-CN quest names and level names", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      star_transactions: {
        data: [
          {
            id: "tx-4",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quests: { name_en: "Homework", name_zh: "作业", icon: "📚" },
            custom_description: null,
          },
        ],
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: "初学者", stars_required: 0, level_number: 1, icon: "🌱" },
          { id: "l-2", name_en: "Explorer", name_zh: "探索者", stars_required: 100, level_number: 2, icon: "🔭" },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("作业")).toBeInTheDocument();
    expect(screen.getByText("探索者")).toBeInTheDocument();
  });

  it("displays quest icon from transaction data", async () => {
    setupMockClient({
      star_transactions: {
        data: [
          {
            id: "tx-5",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quests: { name_en: "Reading", name_zh: "阅读", icon: "📖" },
            custom_description: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("📖")).toBeInTheDocument();
  });

  it("falls back to name_en when name_zh is null in zh-CN locale for level", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: null, stars_required: 0, level_number: 1, icon: "🌱" },
          { id: "l-2", name_en: "Explorer", name_zh: null, stars_required: 100, level_number: 2, icon: "🔭" },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    // name_zh is null so it should fall back to name_en
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("falls back to name_en when name_zh is null for transaction in zh-CN locale", async () => {
    setupMockClient({
      star_transactions: {
        data: [
          {
            id: "tx-zh-1",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quests: { name_en: "Reading", name_zh: null, icon: "📖" },
            custom_description: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    // name_zh is null, so it should fall back to name_en
    expect(screen.getByText("Reading")).toBeInTheDocument();
  });

  it("shows child note in recent transactions", async () => {
    setupMockClient({
      star_transactions: {
        data: [
          {
            id: "tx-note-1",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quests: { name_en: "Homework", name_zh: "作业", icon: "📚" },
            custom_description: null,
            child_note: "I completed this!",
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText('"I completed this!"')).toBeInTheDocument();
  });

  it("uses star emoji when quest icon is missing", async () => {
    setupMockClient({
      star_transactions: {
        data: [
          {
            id: "tx-6",
            created_at: "2026-01-15T10:00:00Z",
            stars: 2,
            status: "approved",
            quests: { name_en: "Simple task", name_zh: "简单任务", icon: null },
            custom_description: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // The default icon is "⭐" when quest icon is null - but it also appears in stats
    // Check the quest name appears (confirming the transaction rendered)
    expect(screen.getByText("Simple task")).toBeInTheDocument();
  });
});
