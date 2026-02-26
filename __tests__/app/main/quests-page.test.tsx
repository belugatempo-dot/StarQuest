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
}));

jest.mock("@/components/admin/QuestManagement", () => {
  return function MockQuestManagement({ quests, locale, familyId, categories }: any) {
    return (
      <div data-testid="quest-management">
        QuestManagement - {quests.length} quests - {categories.length} categories
      </div>
    );
  };
});

jest.mock("@/components/admin/CategoryManagement", () => {
  return function MockCategoryManagement({ categories, quests, locale, familyId }: any) {
    return (
      <div data-testid="category-management">
        CategoryManagement - {categories.length} categories
      </div>
    );
  };
});

jest.mock("@/components/child/QuestGrid", () => {
  return function MockQuestGrid({ quests, locale, userId }: any) {
    return (
      <div data-testid="quest-grid">
        QuestGrid - {quests.length} quests - userId={userId}
      </div>
    );
  };
});

import QuestsPage from "@/app/[locale]/(main)/quests/page";

// ---- Parent View Tests ----

describe("QuestsPage — Parent View", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      name: "Jane",
      role: "parent",
      family_id: "fam-1",
    });
  });

  it("renders quest management header for parent", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("admin.questManagement")).toBeInTheDocument();
    expect(screen.getByText("Manage tasks and activities for your children")).toBeInTheDocument();
  });

  it("renders QuestManagement component", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-management")).toBeInTheDocument();
  });

  it("renders CategoryManagement when categories table exists", async () => {
    const { createClient } = require("@/lib/supabase/server");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "quest_categories") {
        return buildChainMock({ data: [{ id: "cat-1", name_en: "Study" }], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("category-management")).toBeInTheDocument();
  });

  it("hides CategoryManagement when categories table is missing", async () => {
    const { createClient } = require("@/lib/supabase/server");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "quest_categories") {
        return buildChainMock({ data: null, error: { message: "Table not found" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.queryByTestId("category-management")).not.toBeInTheDocument();
  });

  it("renders positive and negative quest counts", async () => {
    const { createClient } = require("@/lib/supabase/server");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "quests") {
        return buildChainMock({
          data: [
            { id: "q1", stars: 5 },
            { id: "q2", stars: 3 },
            { id: "q3", stars: -2 },
          ],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Positive Tasks")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Negative Tasks")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders zh-CN labels", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("管理孩子的任务和活动")).toBeInTheDocument();
    expect(screen.getByText("正向任务")).toBeInTheDocument();
    expect(screen.getByText("负向任务")).toBeInTheDocument();
  });

  it("handles null quests data", async () => {
    const { createClient } = require("@/lib/supabase/server");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "quests") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-management")).toHaveTextContent("0 quests");
  });

  it("passes quests and categories to QuestManagement", async () => {
    const { createClient } = require("@/lib/supabase/server");

    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "quests") {
        return buildChainMock({ data: [{ id: "q1", stars: 5 }], error: null });
      }
      if (table === "quest_categories") {
        return buildChainMock({ data: [{ id: "c1" }, { id: "c2" }], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-management")).toHaveTextContent("1 quests");
    expect(screen.getByTestId("quest-management")).toHaveTextContent("2 categories");
  });
});

// ---- Child View Tests ----

describe("QuestsPage — Child View", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "child-1",
      name: "Alice",
      role: "child",
      family_id: "fam-1",
    });
  });

  it("renders child quest header", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("quests.title")).toBeInTheDocument();
  });

  it("renders quest grid for child", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-grid")).toBeInTheDocument();
    expect(screen.getByTestId("quest-grid")).toHaveTextContent("userId=child-1");
  });

  it("renders tip section", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/You can earn extra stars/)).toBeInTheDocument();
  });

  it("renders description text", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Complete these bonus quests to earn stars/)).toBeInTheDocument();
  });

  it("does not render parent components for child", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.queryByTestId("quest-management")).not.toBeInTheDocument();
    expect(screen.queryByTestId("category-management")).not.toBeInTheDocument();
    expect(screen.queryByText("Positive Tasks")).not.toBeInTheDocument();
  });

  it("passes quests to QuestGrid", async () => {
    const { createClient } = require("@/lib/supabase/server");

    const mockFrom = jest.fn().mockImplementation(() => {
      return buildChainMock({
        data: [
          { id: "q1", type: "bonus", stars: 3 },
          { id: "q2", type: "bonus", stars: 5 },
        ],
        error: null,
      });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-grid")).toHaveTextContent("2 quests");
  });

  it("logs error when quest fetch fails", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockFrom = jest.fn().mockImplementation(() => {
      return buildChainMock({ data: null, error: { message: "DB error" } });
    });
    createClient.mockResolvedValue({ from: mockFrom });

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching quests:",
      { message: "DB error" }
    );
    consoleSpy.mockRestore();
  });

  it("handles null quest data gracefully", async () => {
    const { createClient } = require("@/lib/supabase/server");

    const mockFrom = jest.fn().mockImplementation(() => {
      return buildChainMock({ data: null, error: { message: "error" } });
    });
    createClient.mockResolvedValue({ from: mockFrom });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-grid")).toHaveTextContent("0 quests");
  });
});
