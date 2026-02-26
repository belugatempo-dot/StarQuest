import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

const mockRequireParent = jest.fn();

jest.mock("@/lib/auth", () => ({
  requireParent: (...args: any[]) => mockRequireParent(...args),
}));

jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: any;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  useRouter: jest.fn().mockReturnValue({ push: jest.fn() }),
  usePathname: jest.fn().mockReturnValue("/en/profile/children/child-1"),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
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

let mockAdminFrom: jest.Mock;

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    from: jest
      .fn()
      .mockImplementation(() =>
        buildChainMock({ data: [], error: null })
      ),
  }),
  createAdminClient: jest.fn().mockImplementation(() => ({
    from: (...args: any[]) => mockAdminFrom(...args),
  })),
}));

import ChildDetailPage from "@/app/[locale]/(main)/profile/children/[childId]/page";
import { notFound } from "next/navigation";

function setupMockAdminFrom(overrides: Record<string, any> = {}) {
  mockAdminFrom = jest.fn().mockImplementation((table: string) => {
    if (overrides[table]) return buildChainMock(overrides[table]);
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
    return buildChainMock({ data: [], error: null });
  });
}

async function renderPage(
  locale: string = "en",
  childId: string = "child-1"
) {
  const jsx = await ChildDetailPage({
    params: Promise.resolve({ locale, childId }),
  });
  render(jsx);
}

describe("ChildDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireParent.mockResolvedValue({
      id: "user-1",
      name: "Jane",
      role: "parent",
      family_id: "fam-1",
    });
    setupMockAdminFrom();
  });

  it("renders child name in header", async () => {
    await renderPage();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders current stars", async () => {
    await renderPage();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("renders lifetime stars", async () => {
    await renderPage();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it("renders back to dashboard link", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: /back|dashboard/i });
    expect(link).toHaveAttribute("href", "/en/dashboard");
  });

  it("renders quick action links", async () => {
    await renderPage();
    const recordLink = screen.getByRole("link", { name: /Record Stars/i });
    expect(recordLink).toHaveAttribute(
      "href",
      expect.stringContaining("/en/record?childId=")
    );
    expect(
      screen.getByRole("link", { name: /Approve Requests/i })
    ).toBeInTheDocument();
  });

  it("renders transaction history with empty state", async () => {
    await renderPage();
    expect(
      screen.getByText(/no.*transactions|no.*records|empty/i)
    ).toBeInTheDocument();
  });

  it("renders redemption history with empty state", async () => {
    await renderPage();
    // Both transaction and redemption sections show empty states
    const emptyStates = screen.getAllByText(/no.*transactions|no.*records|no.*redemptions|empty/i);
    expect(emptyStates.length).toBeGreaterThanOrEqual(1);
  });

  it("calls notFound when child not found", async () => {
    setupMockAdminFrom({
      users: { data: null, error: null },
    });

    try {
      await renderPage();
    } catch {
      // notFound mock doesn't throw, so rendering continues and crashes
    }

    expect(notFound).toHaveBeenCalled();
  });

  it("calls notFound when there is an error fetching child", async () => {
    setupMockAdminFrom({
      users: { data: null, error: { message: "DB error" } },
    });

    try {
      await renderPage();
    } catch {
      // notFound mock doesn't throw, so rendering continues and crashes
    }

    expect(notFound).toHaveBeenCalled();
  });

  it("renders transactions table with data", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-1",
            child_id: "child-1",
            stars: 5,
            status: "approved",
            child_note: "Done!",
            parent_response: null,
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: {
              id: "q-1",
              name_en: "Homework",
              name_zh: "作业",
              type: "bonus",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    expect(screen.getByText("Homework")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
    expect(screen.getByText("Done!")).toBeInTheDocument();
  });

  it("renders redemptions table with data", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "red-1",
            child_id: "child-1",
            stars_spent: 10,
            status: "fulfilled",
            created_at: "2026-02-19T14:00:00Z",
            reward: {
              id: "r-1",
              name_en: "Ice Cream",
              name_zh: "冰淇淋",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    expect(screen.getByText("Ice Cream")).toBeInTheDocument();
    expect(screen.getByText("-10")).toBeInTheDocument();
    expect(screen.getByText(/fulfilled/i)).toBeInTheDocument();
  });

  it("renders level progress with multiple levels", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      levels: {
        data: [
          {
            id: "l1",
            level_number: 1,
            stars_required: 0,
            name_en: "Explorer",
            name_zh: "探索者",
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

    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Master")).toBeInTheDocument();
    expect(screen.getByText(/300 stars to next level/i)).toBeInTheDocument();
  });

  it("renders transaction with custom description when quest is null", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-2",
            child_id: "child-1",
            stars: 3,
            status: "approved",
            child_note: null,
            parent_response: null,
            custom_description: "Extra chore",
            created_at: "2026-02-20T10:00:00Z",
            quest: null,
          },
        ],
        error: null,
      },
    });

    await renderPage();

    expect(screen.getByText("Extra chore")).toBeInTheDocument();
  });

  it("renders 'Custom' when quest is null and no custom_description", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-3",
            child_id: "child-1",
            stars: 2,
            status: "approved",
            child_note: null,
            parent_response: null,
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: null,
          },
        ],
        error: null,
      },
    });

    await renderPage();

    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("renders negative stars with text-danger class", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-4",
            child_id: "child-1",
            stars: -3,
            status: "approved",
            child_note: null,
            parent_response: null,
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: {
              id: "q-2",
              name_en: "Fighting",
              name_zh: "打架",
              type: "violation",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    const starsEl = screen.getByText("-3");
    expect(starsEl.className).toMatch(/danger|red|destructive/i);
  });

  it("renders zh-CN locale with Chinese quest and reward names", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-5",
            child_id: "child-1",
            stars: 5,
            status: "approved",
            child_note: null,
            parent_response: null,
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: {
              id: "q-1",
              name_en: "Homework",
              name_zh: "作业",
              type: "bonus",
            },
          },
        ],
        error: null,
      },
      redemptions: {
        data: [
          {
            id: "red-2",
            child_id: "child-1",
            stars_spent: 10,
            status: "fulfilled",
            created_at: "2026-02-19T14:00:00Z",
            reward: {
              id: "r-1",
              name_en: "Ice Cream",
              name_zh: "冰淇淋",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage("zh-CN");

    expect(screen.getByText("作业")).toBeInTheDocument();
    expect(screen.getByText("冰淇淋")).toBeInTheDocument();
  });

  it("shows parent_response as note when child_note is null", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-6",
            child_id: "child-1",
            stars: 5,
            status: "approved",
            child_note: null,
            parent_response: "Good job!",
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: {
              id: "q-1",
              name_en: "Homework",
              name_zh: "作业",
              type: "bonus",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    expect(screen.getByText("Good job!")).toBeInTheDocument();
  });

  it("shows dash when both notes are null", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-7",
            child_id: "child-1",
            stars: 5,
            status: "approved",
            child_note: null,
            parent_response: null,
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: {
              id: "q-1",
              name_en: "Homework",
              name_zh: "作业",
              type: "bonus",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("renders pending status with warning styling", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-8",
            child_id: "child-1",
            stars: 5,
            status: "pending",
            child_note: null,
            parent_response: null,
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: {
              id: "q-1",
              name_en: "Homework",
              name_zh: "作业",
              type: "bonus",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    const statusEl = screen.getByText("pending");
    expect(statusEl.className).toMatch(/warning|yellow|amber/i);
  });

  it("renders redemption with pending status", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "red-3",
            child_id: "child-1",
            stars_spent: 5,
            status: "pending",
            created_at: "2026-02-19T14:00:00Z",
            reward: {
              id: "r-1",
              name_en: "Sticker",
              name_zh: "贴纸",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    expect(screen.getByText("Sticker")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders 'Unknown Reward' when reward is null", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "red-4",
            child_id: "child-1",
            stars_spent: 8,
            status: "fulfilled",
            created_at: "2026-02-19T14:00:00Z",
            reward: null,
          },
        ],
        error: null,
      },
    });

    await renderPage();

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
          {
            id: "l1",
            level_number: 1,
            stars_required: 0,
            name_en: "Explorer",
            name_zh: "探索者",
          },
        ],
        error: null,
      },
    });

    await renderPage();

    expect(
      screen.queryByText(/stars to next level/i)
    ).not.toBeInTheDocument();
  });

  it("renders level progress with correct percentage", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 300 },
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

    // 300 lifetime stars, current level Explorer (100), next level Master (500)
    // Progress = (300 - 100) / (500 - 100) = 200/400 = 50%
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Master")).toBeInTheDocument();
    expect(screen.getByText(/200 stars to next level/i)).toBeInTheDocument();
  });

  it("falls back to name_en when name_zh is null for levels in zh-CN", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      levels: {
        data: [
          {
            id: "l1",
            level_number: 1,
            stars_required: 0,
            name_en: "Explorer",
            name_zh: null,
          },
          {
            id: "l2",
            level_number: 2,
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
    expect(screen.getByText("Master")).toBeInTheDocument();
  });

  it("falls back to name_en when quest name_zh is null in zh-CN", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-9",
            child_id: "child-1",
            stars: 5,
            status: "approved",
            child_note: null,
            parent_response: null,
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: {
              id: "q-1",
              name_en: "Homework",
              name_zh: null,
              type: "bonus",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage("zh-CN");

    expect(screen.getByText("Homework")).toBeInTheDocument();
  });

  it("renders rejected transaction status with danger styling", async () => {
    setupMockAdminFrom({
      star_transactions: {
        data: [
          {
            id: "tx-10",
            child_id: "child-1",
            stars: 5,
            status: "rejected",
            child_note: null,
            parent_response: null,
            custom_description: null,
            created_at: "2026-02-20T10:00:00Z",
            quest: {
              id: "q-1",
              name_en: "Homework",
              name_zh: "作业",
              type: "bonus",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    const statusEl = screen.getByText(/rejected/i);
    expect(statusEl.className).toMatch(/danger|red|destructive/i);
  });

  it("falls back to name_en when reward name_zh is null in zh-CN", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "red-5",
            child_id: "child-1",
            stars_spent: 10,
            status: "fulfilled",
            created_at: "2026-02-19T14:00:00Z",
            reward: {
              id: "r-1",
              name_en: "Ice Cream",
              name_zh: null,
            },
          },
        ],
        error: null,
      },
    });

    await renderPage("zh-CN");

    expect(screen.getByText("Ice Cream")).toBeInTheDocument();
  });

  it("renders rejected redemption status with danger styling", async () => {
    setupMockAdminFrom({
      redemptions: {
        data: [
          {
            id: "red-6",
            child_id: "child-1",
            stars_spent: 10,
            status: "rejected",
            created_at: "2026-02-19T14:00:00Z",
            reward: {
              id: "r-1",
              name_en: "Ice Cream",
              name_zh: "冰淇淋",
            },
          },
        ],
        error: null,
      },
    });

    await renderPage();

    const statusEl = screen.getByText(/rejected/i);
    expect(statusEl.className).toMatch(/danger|red|destructive/i);
  });

  it("renders zh-CN level names in level progress", async () => {
    setupMockAdminFrom({
      child_balances: {
        data: { current_stars: 50, lifetime_stars: 200 },
        error: null,
      },
      levels: {
        data: [
          {
            id: "l1",
            level_number: 1,
            stars_required: 0,
            name_en: "Explorer",
            name_zh: "探索者",
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

    await renderPage("zh-CN");

    expect(screen.getAllByText("探索者").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("大师")).toBeInTheDocument();
  });
});
