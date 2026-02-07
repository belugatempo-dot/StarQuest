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

jest.mock("@/components/admin/LevelManagement", () => {
  return function MockLevelManagement({ levels, locale }: any) {
    return (
      <div data-testid="level-management">
        LevelManagement - {levels.length} levels
      </div>
    );
  };
});

import LevelConfigurationPage from "@/app/[locale]/(parent)/admin/levels/page";

describe("LevelConfigurationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await LevelConfigurationPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Level Configuration")).toBeInTheDocument();
  });

  it("renders level management component", async () => {
    const jsx = await LevelConfigurationPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("level-management")).toBeInTheDocument();
  });

  it("renders statistics: total levels, max stars, avg gap", async () => {
    const jsx = await LevelConfigurationPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Total Levels")).toBeInTheDocument();
    expect(screen.getByText("Max Stars")).toBeInTheDocument();
    expect(screen.getByText("Avg Gap")).toBeInTheDocument();
  });

  it("renders zh-CN header for zh-CN locale", async () => {
    const jsx = await LevelConfigurationPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("等级配置")).toBeInTheDocument();
  });

  it("renders zh-CN statistics labels for zh-CN locale", async () => {
    const jsx = await LevelConfigurationPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    expect(screen.getByText("总等级数")).toBeInTheDocument();
    expect(screen.getByText("最高要求")).toBeInTheDocument();
    expect(screen.getByText("平均间隔")).toBeInTheDocument();
  });

  it("handles null levels data (fallback to 0 stats)", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockResolvedValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({ data: null, error: null })
      ),
    });

    const jsx = await LevelConfigurationPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // levels?.length || 0 => 0 total levels
    // levels && levels.length > 0 => false, so maxStars = 0
    // totalLevels > 1 => false, so avgStarsPerLevel = 0
    expect(screen.getByTestId("level-management")).toHaveTextContent("0 levels");
  });

  it("computes stats correctly with multiple levels", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockResolvedValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({
          data: [
            { id: "l1", level_number: 1, stars_required: 0, name_en: "Beginner" },
            { id: "l2", level_number: 2, stars_required: 50, name_en: "Explorer" },
            { id: "l3", level_number: 3, stars_required: 200, name_en: "Master" },
          ],
          error: null,
        })
      ),
    });

    const jsx = await LevelConfigurationPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // totalLevels = 3, maxStars = 200, avgStarsPerLevel = Math.round(200/2) = 100
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("handles single level (avgStarsPerLevel = 0)", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockResolvedValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({
          data: [
            { id: "l1", level_number: 1, stars_required: 0, name_en: "Beginner" },
          ],
          error: null,
        })
      ),
    });

    const jsx = await LevelConfigurationPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // totalLevels = 1, maxStars = 0, totalLevels > 1 => false, avgStarsPerLevel = 0
    expect(screen.getByTestId("level-management")).toHaveTextContent("1 levels");
  });
});
