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
}));

jest.mock("@/components/admin/QuestManagement", () => {
  return function MockQuestManagement({ quests, locale, familyId, categories }: any) {
    return (
      <div data-testid="quest-management">
        QuestManagement - {quests.length} quests - {familyId}
      </div>
    );
  };
});

jest.mock("@/components/admin/CategoryManagement", () => {
  return function MockCategoryManagement({ categories, locale, familyId }: any) {
    return (
      <div data-testid="category-management">
        CategoryManagement - {categories.length} categories
      </div>
    );
  };
});

import QuestManagementPage from "@/app/[locale]/(parent)/admin/quests/page";

describe("QuestManagementPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await QuestManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("admin.questManagement")).toBeInTheDocument();
  });

  it("renders quest management component", async () => {
    const jsx = await QuestManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-management")).toBeInTheDocument();
  });

  it("renders positive and negative quest counts", async () => {
    const jsx = await QuestManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Positive Tasks")).toBeInTheDocument();
    expect(screen.getByText("Negative Tasks")).toBeInTheDocument();
  });

  it("renders zh-CN labels for zh-CN locale", async () => {
    const jsx = await QuestManagementPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("管理孩子的任务和活动")).toBeInTheDocument();
  });

  it("handles null quests data (fallback to empty arrays)", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockResolvedValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({ data: null, error: null })
      ),
    });

    const jsx = await QuestManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // quests || [] fallback, quests?.filter => null?.filter => undefined => || []
    expect(screen.getByTestId("quest-management")).toHaveTextContent("0 quests");
  });

  it("handles categories error (falls back to empty categories)", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "quest_categories") {
        return buildChainMock({ data: null, error: { message: "Table not found" } });
      }
      return buildChainMock({
        data: [
          { id: "q1", stars: 5, name_en: "Good", name_zh: "好" },
          { id: "q2", stars: -3, name_en: "Bad", name_zh: "坏" },
        ],
        error: null,
      });
    });
    createClient.mockResolvedValueOnce({ from: mockFrom });

    const jsx = await QuestManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // categoriesError ? [] : ... => empty categories
    // categoriesTableMissing is true so CategoryManagement not rendered
    expect(screen.queryByTestId("category-management")).not.toBeInTheDocument();
    // quests still rendered
    expect(screen.getByTestId("quest-management")).toHaveTextContent("2 quests");
  });

  it("counts positive and negative quests correctly", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "quests") {
        return buildChainMock({
          data: [
            { id: "q1", stars: 5, name_en: "Good" },
            { id: "q2", stars: 3, name_en: "Also Good" },
            { id: "q3", stars: -2, name_en: "Bad" },
          ],
          error: null,
        });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValueOnce({ from: mockFrom });

    const jsx = await QuestManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // 2 positive, 1 negative
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders CategoryManagement when categories table exists", async () => {
    const { createClient } = require("@/lib/supabase/server");
    const mockFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null })
    );
    createClient.mockResolvedValueOnce({ from: mockFrom });

    const jsx = await QuestManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // No error => categoriesTableMissing is false => CategoryManagement rendered
    expect(screen.getByTestId("category-management")).toBeInTheDocument();
  });
});
