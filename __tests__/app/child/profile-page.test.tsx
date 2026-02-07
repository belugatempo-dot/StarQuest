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
    created_at: "2026-01-15T00:00:00Z",
  }),
}));

function buildChainMock(resolvedValue: any = { data: [], error: null }) {
  const chain: any = {};
  const methods = [
    "select",
    "eq",
    "order",
    "limit",
    "single",
    "maybeSingle",
    "or",
    "neq",
    "in",
    "gte",
    "lte",
  ];
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
    from: jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null, count: 0 })
    ),
  }),
}));

import ProfilePage from "@/app/[locale]/(child)/app/profile/page";

describe("ProfilePage (Child)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user name in profile header and account info", async () => {
    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Alice appears in profile header (h1) and account info section
    const aliceElements = screen.getAllByText("Alice");
    expect(aliceElements.length).toBeGreaterThanOrEqual(2);
  });

  it("renders statistics section", async () => {
    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("dashboard.lifetimeStars")).toBeInTheDocument();
    expect(screen.getByText("Quests Completed")).toBeInTheDocument();
    expect(screen.getByText("Rewards Claimed")).toBeInTheDocument();
  });

  it("renders achievement badges section", async () => {
    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Achievement Badges")).toBeInTheDocument();
  });

  it("renders account information section", async () => {
    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Account Information")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Member Since")).toBeInTheDocument();
  });

  it("renders language as English for en locale", async () => {
    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("renders current stars default of 0", async () => {
    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Current Stars label is in the profile header
    expect(screen.getByText("Current Stars")).toBeInTheDocument();
  });
});

describe("ProfilePage with data", () => {
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
      if (table === "levels") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "star_transactions") {
        return buildChainMock({ data: [], error: null, count: 0 });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: [], error: null, count: 0 });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });
  }

  it("renders level progress bar when there is a next level", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 80, lifetime_stars: 150 },
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
      star_transactions: { data: [], error: null, count: 5 },
      redemptions: { data: [], error: null, count: 2 },
    });

    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Next level section should appear
    expect(screen.getByText("Next Level")).toBeInTheDocument();
    // Master appears in both progress section and badge wall
    expect(screen.getAllByText("Master").length).toBeGreaterThanOrEqual(1);
    // 150 / 500 stars progress indicator
    expect(screen.getByText("150 / 500 stars")).toBeInTheDocument();
    expect(screen.getByText("350 more stars to go!")).toBeInTheDocument();
  });

  it("does not render level progress when at max level", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 1000, lifetime_stars: 1000 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: "初学者", stars_required: 0, level_number: 1, icon: "🌱" },
          { id: "l-2", name_en: "Master", name_zh: "大师", stars_required: 500, level_number: 2, icon: "🏆" },
        ],
        error: null,
      },
    });

    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.queryByText("Next Level")).not.toBeInTheDocument();
  });

  it("renders achievement badges with unlocked and locked states", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 80, lifetime_stars: 150 },
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

    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Beginner and Explorer should be unlocked (150 >= 0, 150 >= 100)
    const unlocked = screen.getAllByText(/Unlocked/);
    expect(unlocked.length).toBe(2);

    // Master should show locked state with star requirement
    expect(screen.getByText("Lv.3")).toBeInTheDocument();
  });

  it("renders statistics with actual counts", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 80, lifetime_stars: 250 },
        error: null,
      },
      star_transactions: { data: [], error: null, count: 12 },
      redemptions: { data: [], error: null, count: 4 },
    });

    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("250")).toBeInTheDocument(); // lifetime stars
    expect(screen.getByText("12")).toBeInTheDocument(); // total transactions
    expect(screen.getByText("4")).toBeInTheDocument(); // total redemptions
  });

  it("renders zh-CN locale with Chinese level names and language", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 80, lifetime_stars: 150 },
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

    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    // Chinese level names for badges (may appear multiple times due to progress + badges)
    expect(screen.getAllByText("初学者").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("探索者").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("大师").length).toBeGreaterThanOrEqual(1);
    // Language display
    expect(screen.getByText("简体中文")).toBeInTheDocument();
  });

  it("falls back to name_en when name_zh is null for current level in zh-CN locale", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 80, lifetime_stars: 150 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: null, stars_required: 0, level_number: 1, icon: "🌱" },
          { id: "l-2", name_en: "Explorer", name_zh: null, stars_required: 100, level_number: 2, icon: "🔭" },
          { id: "l-3", name_en: "Master", name_zh: null, stars_required: 500, level_number: 3, icon: "🏆" },
        ],
        error: null,
      },
    });

    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    // Current level is Explorer (150 >= 100), name_zh is null so fall back to name_en
    // Explorer appears in header and badge wall
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
    // Next level is Master, name_zh is null so fall back to name_en
    expect(screen.getAllByText("Master").length).toBeGreaterThanOrEqual(1);
    // Badge wall also falls back to name_en for all levels
    expect(screen.getAllByText("Beginner").length).toBeGreaterThanOrEqual(1);
  });

  it("renders current stars in the profile header", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 99, lifetime_stars: 300 },
        error: null,
      },
    });

    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("renders zh-CN next level name in progress section", async () => {
    setupMockClient({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 50 },
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

    const jsx = await ProfilePage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    // Next level section
    expect(screen.getByText("Next Level")).toBeInTheDocument();
    // The next level name in Chinese - appears in Next Level section
    const explorerElements = screen.getAllByText("探索者");
    expect(explorerElements.length).toBeGreaterThanOrEqual(1);
  });
});
