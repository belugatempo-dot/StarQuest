import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  requireParent: jest.fn().mockResolvedValue({
    id: "user-1",
    name: "Jane",
    role: "parent",
    family_id: "fam-1",
  }),
}));

function buildChainMock(resolvedValue: any = { data: null, error: null }) {
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

// Default: child found, empty transactions/redemptions/levels
const mockAdminFrom = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: jest.fn().mockReturnValue({
    from: (...args: any[]) => mockAdminFrom(...args),
  }),
}));

import ChildDetailPage from "@/app/[locale]/(parent)/admin/children/[childId]/page";
import { notFound } from "next/navigation";

describe("ChildDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default return values for different tables
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: {
            id: "child-1",
            name: "Alice",
            avatar_url: null,
            family_id: "fam-1",
            role: "child",
          },
          error: null,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({
          data: { current_stars: 50, lifetime_stars: 200 },
          error: null,
        });
      }
      if (table === "star_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "levels") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
  });

  it("renders child name in header", async () => {
    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders current stars", async () => {
    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("renders lifetime stars", async () => {
    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it("renders back to family link", async () => {
    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    const backLink = screen.getByText(/Back to Family/);
    expect(backLink.closest("a")).toHaveAttribute("href", "/en/admin/family");
  });

  it("renders quick action links", async () => {
    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Record Stars")).toBeInTheDocument();
    expect(screen.getByText("Approve Requests")).toBeInTheDocument();
  });

  it("renders transaction history section with empty state", async () => {
    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Star Transaction History")).toBeInTheDocument();
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("renders redemption history section with empty state", async () => {
    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Redemption History")).toBeInTheDocument();
    expect(screen.getByText("No redemptions yet")).toBeInTheDocument();
  });

  it("calls notFound when child not found", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: null, error: null });
    });

    try {
      await ChildDetailPage({
        params: Promise.resolve({ locale: "en", childId: "nonexistent" }),
      });
    } catch {
      // notFound throws
    }

    expect(notFound).toHaveBeenCalled();
  });

  it("calls notFound when there is an error fetching child", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: null,
          error: { message: "Database error" },
        });
      }
      return buildChainMock({ data: null, error: null });
    });

    try {
      await ChildDetailPage({
        params: Promise.resolve({ locale: "en", childId: "child-1" }),
      });
    } catch {
      // notFound throws
    }

    expect(notFound).toHaveBeenCalled();
  });
});

describe("ChildDetailPage with data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupMockAdminFrom(overrides: Record<string, any> = {}) {
    mockAdminFrom.mockImplementation((table: string) => {
      if (overrides[table]) {
        return buildChainMock(overrides[table]);
      }
      if (table === "users") {
        return buildChainMock({
          data: {
            id: "child-1",
            name: "Alice",
            avatar_url: null,
            family_id: "fam-1",
            role: "child",
          },
          error: null,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({
          data: { current_stars: 50, lifetime_stars: 200 },
          error: null,
        });
      }
      if (table === "star_transactions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "redemptions") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "levels") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
  }

  it("renders transactions table with data", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-1",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quest: { name_en: "Homework", name_zh: "作业" },
            child_note: "Done!",
            parent_response: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Star Transaction History")).toBeInTheDocument();
    expect(screen.getByText("Homework")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByText("Done!")).toBeInTheDocument();
    // Should NOT show empty state
    expect(screen.queryByText("No transactions yet")).not.toBeInTheDocument();
  });

  it("renders redemptions table with data", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "rd-1",
            created_at: "2026-01-15T10:00:00Z",
            stars_spent: 10,
            status: "fulfilled",
            reward: { name_en: "Ice Cream", name_zh: "冰淇淋", stars_cost: 10 },
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Redemption History")).toBeInTheDocument();
    expect(screen.getByText("Ice Cream")).toBeInTheDocument();
    expect(screen.getByText("-10")).toBeInTheDocument();
    expect(screen.getByText("fulfilled")).toBeInTheDocument();
    expect(screen.queryByText("No redemptions yet")).not.toBeInTheDocument();
  });

  it("renders level progress with multiple levels", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: "初学者", stars_required: 0, level_number: 1 },
          { id: "l-2", name_en: "Explorer", name_zh: "探索者", stars_required: 100, level_number: 2 },
          { id: "l-3", name_en: "Master", name_zh: "大师", stars_required: 500, level_number: 3 },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    // Current level should be Explorer (lifetimeStars=200 >= 100)
    // Next level should be Master (500)
    expect(screen.getByText("Level Progress")).toBeInTheDocument();
    // Both current and next level names appear in the progress bar
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Master")).toBeInTheDocument();
    expect(screen.getByText("300 stars to next level")).toBeInTheDocument();
  });

  it("renders transaction with custom description when quest is null", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-2",
            created_at: "2026-01-15T10:00:00Z",
            stars: 3,
            status: "approved",
            quest: null,
            custom_description: "Extra credit",
            child_note: null,
            parent_response: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Extra credit")).toBeInTheDocument();
  });

  it("renders 'Custom' when quest is null and no custom_description", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-3",
            created_at: "2026-01-15T10:00:00Z",
            stars: 2,
            status: "approved",
            quest: null,
            custom_description: null,
            child_note: null,
            parent_response: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("renders negative stars with text-danger class", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-4",
            created_at: "2026-01-15T10:00:00Z",
            stars: -3,
            status: "approved",
            quest: { name_en: "Bad behavior", name_zh: "不良行为" },
            child_note: null,
            parent_response: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    // Negative stars: no "+" prefix, just "-3"
    const starsCell = screen.getByText("-3");
    expect(starsCell).toBeInTheDocument();
    expect(starsCell.className).toContain("text-danger");
  });

  it("renders zh-CN locale with Chinese quest and reward names", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-5",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quest: { name_en: "Homework", name_zh: "作业" },
            child_note: null,
            parent_response: null,
          },
        ],
        error: null,
      },
      redemptions: {
        data: [
          {
            id: "rd-2",
            created_at: "2026-01-15T10:00:00Z",
            stars_spent: 10,
            status: "fulfilled",
            reward: { name_en: "Ice Cream", name_zh: "冰淇淋", stars_cost: 10 },
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "zh-CN", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("作业")).toBeInTheDocument();
    expect(screen.getByText("冰淇淋")).toBeInTheDocument();
  });

  it("shows parent_response as note when child_note is null", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-6",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quest: { name_en: "Reading", name_zh: "阅读" },
            child_note: null,
            parent_response: "Good job!",
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Good job!")).toBeInTheDocument();
  });

  it("shows dash when both child_note and parent_response are null", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-7",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quest: { name_en: "Chores", name_zh: "家务" },
            child_note: null,
            parent_response: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    // Note column should show "-"
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("renders pending status with warning styling", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-8",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "pending",
            quest: { name_en: "Exercise", name_zh: "锻炼" },
            child_note: null,
            parent_response: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    const statusBadge = screen.getByText("pending");
    expect(statusBadge.className).toContain("bg-warning/20");
  });

  it("renders redemption with pending status", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "rd-3",
            created_at: "2026-01-15T10:00:00Z",
            stars_spent: 20,
            status: "pending",
            reward: { name_en: "Toy", name_zh: "玩具", stars_cost: 20 },
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    const statusBadge = screen.getByText("pending");
    expect(statusBadge.className).toContain("bg-warning/20");
  });

  it("renders 'Unknown Reward' when reward is null", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "rd-4",
            created_at: "2026-01-15T10:00:00Z",
            stars_spent: 5,
            status: "approved",
            reward: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getByText("Unknown Reward")).toBeInTheDocument();
  });

  it("does not show level progress when no next level exists", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 1000, lifetime_stars: 1000 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: "初学者", stars_required: 0, level_number: 1 },
          { id: "l-2", name_en: "Master", name_zh: "大师", stars_required: 500, level_number: 2 },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    // At the max level (1000 >= 500), no next level, so no "Level Progress" section
    expect(screen.queryByText("Level Progress")).not.toBeInTheDocument();
  });

  it("renders level progress with correct percentage", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 300 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: "初学者", stars_required: 0, level_number: 1 },
          { id: "l-2", name_en: "Explorer", name_zh: "探索者", stars_required: 100, level_number: 2 },
          { id: "l-3", name_en: "Master", name_zh: "大师", stars_required: 500, level_number: 3 },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    // lifetimeStars=300, currentLevel=Explorer(100), nextLevel=Master(500)
    // progress = (300-100) / (500-100) * 100 = 50%
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("200 stars to next level")).toBeInTheDocument();
  });

  it("falls back to name_en when name_zh is null for levels in zh-CN locale", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: null, stars_required: 0, level_number: 1 },
          { id: "l-2", name_en: "Explorer", name_zh: null, stars_required: 100, level_number: 2 },
          { id: "l-3", name_en: "Master", name_zh: null, stars_required: 500, level_number: 3 },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "zh-CN", childId: "child-1" }),
    });
    render(jsx);

    // name_zh is null so it falls back to name_en for both currentLevel and nextLevel
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Master")).toBeInTheDocument();
  });

  it("falls back to name_en when quest name_zh is null in zh-CN locale", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-zh-1",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "approved",
            quest: { name_en: "Homework", name_zh: null },
            child_note: null,
            parent_response: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "zh-CN", childId: "child-1" }),
    });
    render(jsx);

    // name_zh is null so it falls back to name_en
    expect(screen.getByText("Homework")).toBeInTheDocument();
  });

  it("renders rejected transaction status with danger styling", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-rej-1",
            created_at: "2026-01-15T10:00:00Z",
            stars: 5,
            status: "rejected",
            quest: { name_en: "Exercise", name_zh: "锻炼" },
            child_note: null,
            parent_response: null,
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    const statusBadge = screen.getByText("rejected");
    expect(statusBadge.className).toContain("bg-danger/20");
  });

  it("falls back to name_en when reward name_zh is null in zh-CN locale", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "rd-zh-1",
            created_at: "2026-01-15T10:00:00Z",
            stars_spent: 10,
            status: "fulfilled",
            reward: { name_en: "Ice Cream", name_zh: null, stars_cost: 10 },
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "zh-CN", childId: "child-1" }),
    });
    render(jsx);

    // name_zh is null so it falls back to name_en
    expect(screen.getByText("Ice Cream")).toBeInTheDocument();
  });

  it("renders rejected redemption status with danger styling", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "rd-rej-1",
            created_at: "2026-01-15T10:00:00Z",
            stars_spent: 10,
            status: "rejected",
            reward: { name_en: "Toy", name_zh: "玩具", stars_cost: 10 },
          },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "en", childId: "child-1" }),
    });
    render(jsx);

    const statusBadge = screen.getByText("rejected");
    expect(statusBadge.className).toContain("bg-danger/20");
  });

  it("renders zh-CN level names in level progress", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      levels: {
        data: [
          { id: "l-1", name_en: "Beginner", name_zh: "初学者", stars_required: 0, level_number: 1 },
          { id: "l-2", name_en: "Explorer", name_zh: "探索者", stars_required: 100, level_number: 2 },
          { id: "l-3", name_en: "Master", name_zh: "大师", stars_required: 500, level_number: 3 },
        ],
        error: null,
      },
    });

    const jsx = await ChildDetailPage({
      params: Promise.resolve({ locale: "zh-CN", childId: "child-1" }),
    });
    render(jsx);

    expect(screen.getAllByText("探索者").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("大师")).toBeInTheDocument();
  });
});
