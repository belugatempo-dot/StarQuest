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
    from: jest
      .fn()
      .mockImplementation(() =>
        buildChainMock({ data: [], error: null, count: 0 })
      ),
  }),
  createAdminClient: jest.fn().mockReturnValue({
    from: jest
      .fn()
      .mockImplementation(() =>
        buildChainMock({ data: [], error: null })
      ),
  }),
}));

jest.mock("@/components/admin/LevelManagement", () => {
  return function MockLevelManagement({ levels, locale }: any) {
    return (
      <div data-testid="level-management">
        LevelManagement - {levels.length} levels
      </div>
    );
  };
});

jest.mock("@/components/admin/CreditManagementClient", () => {
  return function MockCreditManagementClient({
    familyId,
    settlementDay,
    locale,
  }: any) {
    return (
      <div data-testid="credit-management-client">
        CreditManagementClient - {familyId} - settlement: {settlementDay} -{" "}
        {locale}
      </div>
    );
  };
});

import ProfilePage from "@/app/[locale]/(main)/profile/page";

async function renderPage(locale: string = "en") {
  const jsx = await ProfilePage({ params: Promise.resolve({ locale }) });
  render(jsx);
}

// Helper for child tests - sets up mock client with table-specific overrides
function setupMockClient(overrides: Record<string, any> = {}) {
  const { createClient } = require("@/lib/supabase/server");
  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (overrides[table]) return buildChainMock(overrides[table]);
    if (table === "child_balances")
      return buildChainMock({ data: null, error: null });
    if (table === "levels")
      return buildChainMock({ data: [], error: null });
    if (table === "star_transactions")
      return buildChainMock({ data: [], error: null, count: 0 });
    if (table === "redemptions")
      return buildChainMock({ data: [], error: null, count: 0 });
    return buildChainMock({ data: [], error: null });
  });
  createClient.mockResolvedValue({ from: mockFrom });
}

describe("ProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Parent branch", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({
        id: "user-1",
        name: "Jane",
        role: "parent",
        family_id: "fam-1",
      });
    });

    it("renders level configuration header for parent", async () => {
      await renderPage();
      expect(screen.getByText("Level Configuration")).toBeInTheDocument();
    });

    it("renders LevelManagement component", async () => {
      await renderPage();
      expect(screen.getByTestId("level-management")).toBeInTheDocument();
    });

    it("renders CreditManagementClient component", async () => {
      await renderPage();
      expect(
        screen.getByTestId("credit-management-client")
      ).toBeInTheDocument();
    });

    it("renders credit header", async () => {
      await renderPage();
      expect(screen.getByText(/credit\.pageTitle/)).toBeInTheDocument();
    });

    it("renders level stats labels", async () => {
      await renderPage();
      expect(screen.getByText("Total Levels")).toBeInTheDocument();
      expect(screen.getByText("Max Stars")).toBeInTheDocument();
      expect(screen.getByText("Avg Gap")).toBeInTheDocument();
    });

    it("renders zh-CN labels", async () => {
      await renderPage("zh-CN");
      expect(screen.getByText("等级配置")).toBeInTheDocument();
      expect(screen.getByText("总等级数")).toBeInTheDocument();
      expect(screen.getByText("最高要求")).toBeInTheDocument();
      expect(screen.getByText("平均间隔")).toBeInTheDocument();
    });

    it("computes stats correctly with multiple levels", async () => {
      const { createClient } = require("@/lib/supabase/server");
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === "levels") {
          return buildChainMock({
            data: [
              { id: "l1", level_number: 1, stars_required: 0 },
              { id: "l2", level_number: 2, stars_required: 50 },
              { id: "l3", level_number: 3, stars_required: 200 },
            ],
            error: null,
          });
        }
        return buildChainMock({ data: [], error: null });
      });
      createClient.mockResolvedValue({ from: mockFrom });

      await renderPage();

      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("200")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("handles null levels data (fallback to 0 stats)", async () => {
      const { createClient } = require("@/lib/supabase/server");
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === "levels") {
          return buildChainMock({ data: null, error: null });
        }
        return buildChainMock({ data: [], error: null });
      });
      createClient.mockResolvedValue({ from: mockFrom });

      await renderPage();

      expect(screen.getByText("Total Levels")).toBeInTheDocument();
      const statValues = screen.getAllByText("0");
      expect(statValues.length).toBeGreaterThanOrEqual(2);
    });

    it("passes settlement day to CreditManagementClient", async () => {
      const { createAdminClient } = require("@/lib/supabase/server");
      const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
        if (table === "families") {
          return buildChainMock({
            data: { settlement_day: 15 },
            error: null,
          });
        }
        return buildChainMock({ data: [], error: null });
      });
      createAdminClient.mockReturnValue({ from: mockAdminFrom });

      await renderPage();

      expect(screen.getByText(/settlement: 15/)).toBeInTheDocument();
    });

    it("falls back to settlement day 1 when familySettings is null", async () => {
      const { createAdminClient } = require("@/lib/supabase/server");
      const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
        if (table === "families") {
          return buildChainMock({ data: null, error: null });
        }
        return buildChainMock({ data: [], error: null });
      });
      createAdminClient.mockReturnValue({ from: mockAdminFrom });

      await renderPage();

      expect(screen.getByText(/settlement: 1/)).toBeInTheDocument();
    });
  });

  describe("Child branch", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({
        id: "child-1",
        name: "Alice",
        role: "child",
        avatar_url: null,
        created_at: "2026-01-15T00:00:00Z",
        family_id: "fam-1",
      });
      setupMockClient();
    });

    it("renders user name in profile header and account info", async () => {
      await renderPage();
      const aliceElements = screen.getAllByText("Alice");
      expect(aliceElements.length).toBeGreaterThanOrEqual(2);
    });

    it("renders statistics section", async () => {
      await renderPage();
      expect(screen.getByText("dashboard.lifetimeStars")).toBeInTheDocument();
      expect(screen.getByText("Quests Completed")).toBeInTheDocument();
      expect(screen.getByText("Rewards Claimed")).toBeInTheDocument();
    });

    it("renders achievement badges section", async () => {
      await renderPage();
      expect(screen.getByText("Achievement Badges")).toBeInTheDocument();
    });

    it("renders account information section", async () => {
      await renderPage();
      expect(screen.getByText("Account Information")).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Language")).toBeInTheDocument();
      expect(screen.getByText("Member Since")).toBeInTheDocument();
    });

    it("renders language as English for en locale", async () => {
      await renderPage("en");
      expect(screen.getByText("English")).toBeInTheDocument();
    });

    it("renders Current Stars label", async () => {
      await renderPage();
      expect(screen.getByText("Current Stars")).toBeInTheDocument();
    });

    it("does not render parent components for child", async () => {
      await renderPage();
      expect(screen.queryByTestId("level-management")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("credit-management-client")
      ).not.toBeInTheDocument();
    });

    it("renders level progress bar when there is a next level", async () => {
      setupMockClient({
        child_balances: {
          data: { current_stars: 80, lifetime_stars: 150 },
          error: null,
        },
        levels: {
          data: [
            {
              id: "l1",
              level_number: 1,
              stars_required: 0,
              name_en: "Beginner",
              name_zh: "初学者",
            },
            {
              id: "l2",
              level_number: 2,
              stars_required: 100,
              name_en: "Explorer",
              name_zh: "探索者",
            },
            {
              id: "l3",
              level_number: 3,
              stars_required: 500,
              name_en: "Master",
              name_zh: "大师",
            },
          ],
          error: null,
        },
      });

      await renderPage();

      expect(screen.getByText("Next Level")).toBeInTheDocument();
      expect(screen.getByText(/150 \/ 500 stars/)).toBeInTheDocument();
      expect(screen.getByText(/350 more stars to go!/)).toBeInTheDocument();
    });

    it("does not render level progress when at max level", async () => {
      setupMockClient({
        child_balances: {
          data: { current_stars: 1000, lifetime_stars: 1000 },
          error: null,
        },
        levels: {
          data: [
            {
              id: "l1",
              level_number: 1,
              stars_required: 0,
              name_en: "Beginner",
              name_zh: "初学者",
            },
            {
              id: "l2",
              level_number: 2,
              stars_required: 500,
              name_en: "Master",
              name_zh: "大师",
            },
          ],
          error: null,
        },
      });

      await renderPage();

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
            {
              id: "l1",
              level_number: 1,
              stars_required: 0,
              name_en: "Beginner",
              name_zh: "初学者",
            },
            {
              id: "l2",
              level_number: 2,
              stars_required: 100,
              name_en: "Explorer",
              name_zh: "探索者",
            },
            {
              id: "l3",
              level_number: 3,
              stars_required: 500,
              name_en: "Master",
              name_zh: "大师",
            },
          ],
          error: null,
        },
      });

      await renderPage();

      const unlocked = screen.getAllByText(/Unlocked/);
      expect(unlocked.length).toBe(2);
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

      await renderPage();

      expect(screen.getByText("250")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("renders zh-CN with Chinese level names and language", async () => {
      setupMockClient({
        child_balances: {
          data: { current_stars: 80, lifetime_stars: 150 },
          error: null,
        },
        levels: {
          data: [
            {
              id: "l1",
              level_number: 1,
              stars_required: 0,
              name_en: "Beginner",
              name_zh: "初学者",
            },
            {
              id: "l2",
              level_number: 2,
              stars_required: 100,
              name_en: "Explorer",
              name_zh: "探索者",
            },
            {
              id: "l3",
              level_number: 3,
              stars_required: 500,
              name_en: "Master",
              name_zh: "大师",
            },
          ],
          error: null,
        },
      });

      await renderPage("zh-CN");

      expect(screen.getAllByText("初学者").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("探索者").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("大师").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("简体中文")).toBeInTheDocument();
    });

    it("falls back to name_en when name_zh is null", async () => {
      setupMockClient({
        child_balances: {
          data: { current_stars: 80, lifetime_stars: 150 },
          error: null,
        },
        levels: {
          data: [
            {
              id: "l1",
              level_number: 1,
              stars_required: 0,
              name_en: "Beginner",
              name_zh: null,
            },
            {
              id: "l2",
              level_number: 2,
              stars_required: 100,
              name_en: "Explorer",
              name_zh: null,
            },
            {
              id: "l3",
              level_number: 3,
              stars_required: 500,
              name_en: "Master",
              name_zh: null,
            },
          ],
          error: null,
        },
      });

      await renderPage("zh-CN");

      expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Master").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Beginner").length).toBeGreaterThanOrEqual(1);
    });

    it("renders current stars in profile header", async () => {
      setupMockClient({
        child_balances: {
          data: { current_stars: 99, lifetime_stars: 300 },
          error: null,
        },
      });

      await renderPage();

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
            {
              id: "l1",
              level_number: 1,
              stars_required: 0,
              name_en: "Beginner",
              name_zh: "初学者",
            },
            {
              id: "l2",
              level_number: 2,
              stars_required: 100,
              name_en: "Explorer",
              name_zh: "探索者",
            },
          ],
          error: null,
        },
      });

      await renderPage("zh-CN");

      expect(screen.getByText("Next Level")).toBeInTheDocument();
      expect(screen.getAllByText("探索者").length).toBeGreaterThanOrEqual(1);
    });
  });
});
