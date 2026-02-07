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

jest.mock("@/components/child/QuestGrid", () => {
  return function MockQuestGrid({ quests, locale, userId }: any) {
    return (
      <div data-testid="quest-grid">
        QuestGrid - {quests.length} quests - {userId}
      </div>
    );
  };
});

import QuestsPage from "@/app/[locale]/(child)/app/quests/page";

describe("QuestsPage (Child)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("quests.title")).toBeInTheDocument();
  });

  it("renders quest grid component", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-grid")).toBeInTheDocument();
  });

  it("passes userId to QuestGrid", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quest-grid")).toHaveTextContent("child-1");
  });

  it("renders tip section", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Tip:/)).toBeInTheDocument();
  });

  it("renders description about bonus quests", async () => {
    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(
      screen.getByText(/Complete these bonus quests to earn stars/)
    ).toBeInTheDocument();
  });

  it("logs error when quest fetch fails", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockResolvedValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({ data: null, error: { message: "Fetch error" } })
      ),
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const jsx = await QuestsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching quests:",
      { message: "Fetch error" }
    );
    consoleSpy.mockRestore();
  });
});
