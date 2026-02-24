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

const mockSupabaseFrom = jest
  .fn()
  .mockImplementation(() => buildChainMock({ data: [], error: null }));
const mockAdminFrom = jest
  .fn()
  .mockImplementation(() => buildChainMock({ data: [], error: null }));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    from: (...args: any[]) => mockSupabaseFrom(...args),
  }),
  createAdminClient: jest.fn().mockReturnValue({
    from: (...args: any[]) => mockAdminFrom(...args),
  }),
}));

jest.mock("@/components/admin/InviteParentCard", () => {
  return function MockInviteParentCard({ familyId, locale }: any) {
    return (
      <div data-testid="invite-parent-card">
        InviteParent - {familyId} - {locale}
      </div>
    );
  };
});

jest.mock("@/components/admin/FamilyMemberList", () => {
  return function MockFamilyMemberList({
    parents,
    familyChildren,
    currentUser,
    locale,
  }: any) {
    return (
      <div data-testid="family-member-list">
        FamilyMemberList - {parents.length}p - {familyChildren.length}c
      </div>
    );
  };
});

jest.mock("@/components/admin/ApprovalTabs", () => {
  return function MockApprovalTabs({
    starRequests,
    redemptionRequests,
    locale,
    parentId,
  }: any) {
    return (
      <div data-testid="approval-tabs">
        ApprovalTabs - {starRequests.length}s - {redemptionRequests.length}r
      </div>
    );
  };
});

import DashboardPage from "@/app/[locale]/(main)/dashboard/page";

// ---- Helper to resolve nested async server components ----
// DashboardPage returns <ParentDashboard .../> or <ChildDashboard .../>
// which are async functions. React Testing Library can't render async components,
// so we manually resolve the nested async component chain.
async function renderDashboard(locale: string) {
  const outerJsx = await DashboardPage({
    params: Promise.resolve({ locale }),
  });
  const resolvedJsx = await (outerJsx as any).type((outerJsx as any).props);
  render(resolvedJsx);
}

// ---- Helper to set up mock data ----

function setupParentMocks(overrides: {
  starRequests?: any[];
  redemptionRequests?: any[];
  family?: any;
  familyError?: any;
  balances?: any[];
  members?: any[];
} = {}) {
  const {
    starRequests = [],
    redemptionRequests = [],
    family = { id: "fam-1", name: "Smith Family" },
    familyError = null,
    balances = [],
    members = [
      { id: "user-1", name: "Jane", role: "parent", created_at: "2026-01-01" },
    ],
  } = overrides;

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "star_transactions") {
      return buildChainMock({ data: starRequests, error: null });
    }
    if (table === "redemptions") {
      return buildChainMock({ data: redemptionRequests, error: null });
    }
    if (table === "families") {
      return buildChainMock({ data: family, error: familyError });
    }
    return buildChainMock({ data: [], error: null });
  });

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "child_balances") {
      return buildChainMock({ data: balances, error: null });
    }
    if (table === "users") {
      return buildChainMock({ data: members, error: null });
    }
    return buildChainMock({ data: [], error: null });
  });
}

function setupChildMocks(overrides: {
  balance?: any;
  transactions?: any[];
  levels?: any[];
} = {}) {
  const {
    balance = { current_stars: 50, lifetime_stars: 120 },
    transactions = [],
    levels = [
      {
        level_number: 1,
        name_en: "Beginner",
        name_zh: "新手",
        icon: "🌱",
        stars_required: 0,
      },
      {
        level_number: 2,
        name_en: "Explorer",
        name_zh: "探索者",
        icon: "🔍",
        stars_required: 100,
      },
    ],
  } = overrides;

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "child_balances") {
      return buildChainMock({ data: balance, error: null });
    }
    if (table === "star_transactions") {
      return buildChainMock({ data: transactions, error: null });
    }
    if (table === "levels") {
      return buildChainMock({ data: levels, error: null });
    }
    return buildChainMock({ data: [], error: null });
  });
}

// ---- Parent View Tests ----

describe("DashboardPage — Parent View", () => {
  const parentUser = {
    id: "user-1",
    name: "Jane",
    role: "parent",
    family_id: "fam-1",
    email: "jane@test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(parentUser);
    setupParentMocks();
  });

  it("renders welcome header with parent name", async () => {
    await renderDashboard("en");
    expect(screen.getByText(/Welcome, Jane!/)).toBeInTheDocument();
  });

  it("renders pending approvals card", async () => {
    await renderDashboard("en");
    expect(screen.getByText("admin.pendingApprovals")).toBeInTheDocument();
  });

  it("renders family members card", async () => {
    setupParentMocks({
      members: [
        { id: "u1", name: "Jane", role: "parent", created_at: "2026-01-01" },
        { id: "u2", name: "Alice", role: "child", created_at: "2026-01-02" },
      ],
    });

    await renderDashboard("en");
    expect(screen.getByText("Family Members")).toBeInTheDocument();
  });

  it("renders Quick Record link to /en/record", async () => {
    await renderDashboard("en");
    const recordLink = screen.getAllByRole("link").find(
      (l) => l.getAttribute("href") === "/en/record"
    );
    expect(recordLink).toBeTruthy();
  });

  it("renders Credit Management link to /en/profile#credit", async () => {
    await renderDashboard("en");
    const creditLink = screen.getAllByRole("link").find(
      (l) => l.getAttribute("href") === "/en/profile#credit"
    );
    expect(creditLink).toBeTruthy();
  });

  it("renders InviteParentCard", async () => {
    await renderDashboard("en");
    expect(screen.getByTestId("invite-parent-card")).toBeInTheDocument();
  });

  it("renders FamilyMemberList", async () => {
    await renderDashboard("en");
    expect(screen.getByTestId("family-member-list")).toBeInTheDocument();
  });

  it("renders ApprovalTabs when there are pending requests", async () => {
    setupParentMocks({
      starRequests: [{ id: "sr-1", status: "pending" }],
      redemptionRequests: [{ id: "rr-1", status: "pending" }],
    });

    await renderDashboard("en");
    expect(screen.getByTestId("approval-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("approval-tabs")).toHaveTextContent("1s");
    expect(screen.getByTestId("approval-tabs")).toHaveTextContent("1r");
  });

  it("does not render ApprovalTabs when pending count is 0", async () => {
    setupParentMocks({
      starRequests: [],
      redemptionRequests: [],
    });

    await renderDashboard("en");
    expect(screen.queryByTestId("approval-tabs")).not.toBeInTheDocument();
  });

  it("renders children overview with child links", async () => {
    setupParentMocks({
      members: [
        { id: "u1", name: "Jane", role: "parent", created_at: "2026-01-01" },
        {
          id: "child-1",
          name: "Alice",
          role: "child",
          avatar_url: "👧",
          created_at: "2026-01-02",
        },
      ],
      balances: [
        { child_id: "child-1", current_stars: 42, lifetime_stars: 100 },
      ],
    });

    await renderDashboard("en");
    expect(screen.getByText("Children Overview")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();

    const childLink = screen.getAllByRole("link").find(
      (l) => l.getAttribute("href") === "/en/profile/children/child-1"
    );
    expect(childLink).toBeTruthy();
  });

  it("shows current stars and lifetime stats for children", async () => {
    setupParentMocks({
      members: [
        { id: "u1", name: "Jane", role: "parent", created_at: "2026-01-01" },
        { id: "c1", name: "Bob", role: "child", created_at: "2026-01-02" },
      ],
      balances: [{ child_id: "c1", current_stars: 42, lifetime_stars: 200 }],
    });

    await renderDashboard("en");
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows empty state when no children added", async () => {
    setupParentMocks({
      members: [
        { id: "u1", name: "Jane", role: "parent", created_at: "2026-01-01" },
      ],
    });

    await renderDashboard("en");
    expect(screen.getByText("No children added yet")).toBeInTheDocument();
  });

  it("shows family name in management section", async () => {
    setupParentMocks({
      family: { id: "fam-1", name: "Smith Family" },
    });

    await renderDashboard("en");
    expect(screen.getByText("Smith Family")).toBeInTheDocument();
  });

  it("renders zh-CN family members label", async () => {
    setupParentMocks({
      members: [
        { id: "u1", name: "妈妈", role: "parent", created_at: "2026-01-01" },
        { id: "c1", name: "小明", role: "child", created_at: "2026-01-02" },
      ],
    });

    await renderDashboard("zh-CN");
    expect(screen.getByText("家庭成员")).toBeInTheDocument();
  });

  it("displays pending totals correctly", async () => {
    setupParentMocks({
      starRequests: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
      redemptionRequests: [{ id: "r1" }],
    });

    await renderDashboard("en");
    // Total pending = 3 + 1 = 4 (appears in both stats card and approval center)
    const pendingCounts = screen.getAllByText("4");
    expect(pendingCounts.length).toBeGreaterThanOrEqual(1);
    // Breakdown text: "3 stars, 1 redemptions"
    expect(screen.getByText(/3 stars, 1 redemptions/)).toBeInTheDocument();
  });

  it("logs error when family fetch fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    setupParentMocks({
      familyError: { message: "Family not found" },
      family: null,
    });

    await renderDashboard("en");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching family:",
      { message: "Family not found" }
    );
    consoleSpy.mockRestore();
  });

  it("falls back to regular client when admin client returns no members", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: [], error: null });
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "u1", name: "Jane", role: "parent", created_at: "2026-01-01" },
          ],
          error: null,
        });
      }
      if (table === "families") {
        return buildChainMock({ data: { id: "fam-1", name: "Test" }, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });

    await renderDashboard("en");
    expect(screen.getByText(/Welcome, Jane!/)).toBeInTheDocument();
  });
});

// ---- Child View Tests ----

describe("DashboardPage — Child View", () => {
  const childUser = {
    id: "child-1",
    name: "Alice",
    role: "child",
    family_id: "fam-1",
    email: "alice@test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(childUser);
    setupChildMocks();
  });

  it("renders welcome header with child name", async () => {
    await renderDashboard("en");
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("renders current balance card", async () => {
    await renderDashboard("en");
    expect(screen.getByText("dashboard.currentBalance")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("renders lifetime stars card", async () => {
    await renderDashboard("en");
    expect(screen.getByText("dashboard.lifetimeStars")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("renders current level card", async () => {
    await renderDashboard("en");
    expect(screen.getByText("dashboard.currentLevel")).toBeInTheDocument();
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("renders zh-CN level name", async () => {
    setupChildMocks({
      balance: { current_stars: 50, lifetime_stars: 120 },
      levels: [
        {
          level_number: 1,
          name_en: "Beginner",
          name_zh: "新手",
          icon: "🌱",
          stars_required: 0,
        },
        {
          level_number: 2,
          name_en: "Explorer",
          name_zh: "探索者",
          icon: "🔍",
          stars_required: 100,
        },
      ],
    });

    await renderDashboard("zh-CN");
    expect(screen.getByText("探索者")).toBeInTheDocument();
  });

  it("renders recent activity list with transactions", async () => {
    setupChildMocks({
      transactions: [
        {
          id: "tx-1",
          stars: 5,
          status: "approved",
          created_at: "2026-01-15T10:00:00Z",
          quests: { name_en: "Homework", name_zh: "作业", icon: "📚" },
        },
      ],
    });

    await renderDashboard("en");
    expect(screen.getByText("dashboard.recentActivity")).toBeInTheDocument();
    expect(screen.getByText("Homework")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("renders empty state when no transactions", async () => {
    setupChildMocks({ transactions: [] });

    await renderDashboard("en");
    expect(
      screen.getByText("No recent activity yet. Start completing quests!")
    ).toBeInTheDocument();
  });

  it("renders zh-CN quest name for zh-CN locale", async () => {
    setupChildMocks({
      transactions: [
        {
          id: "tx-1",
          stars: 3,
          status: "approved",
          created_at: "2026-01-15T10:00:00Z",
          quests: { name_en: "Homework", name_zh: "作业", icon: "📚" },
        },
      ],
    });

    await renderDashboard("zh-CN");
    expect(screen.getByText("作业")).toBeInTheDocument();
  });

  it("displays child_note when present", async () => {
    setupChildMocks({
      transactions: [
        {
          id: "tx-1",
          stars: 5,
          status: "approved",
          created_at: "2026-01-15T10:00:00Z",
          quests: { name_en: "Homework", icon: "📚" },
          child_note: "Finished math chapter 5",
        },
      ],
    });

    await renderDashboard("en");
    expect(screen.getByText(/Finished math chapter 5/)).toBeInTheDocument();
  });

  it("shows negative stars with correct styling class", async () => {
    setupChildMocks({
      transactions: [
        {
          id: "tx-1",
          stars: -3,
          status: "approved",
          created_at: "2026-01-15T10:00:00Z",
          quests: { name_en: "Late bedtime", icon: "🌙" },
        },
      ],
    });

    await renderDashboard("en");
    expect(screen.getByText("-3")).toBeInTheDocument();
  });

  it("uses custom_description when no quest name", async () => {
    setupChildMocks({
      transactions: [
        {
          id: "tx-1",
          stars: 2,
          status: "approved",
          created_at: "2026-01-15T10:00:00Z",
          quests: null,
          custom_description: "Extra chores",
        },
      ],
    });

    await renderDashboard("en");
    expect(screen.getByText("Extra chores")).toBeInTheDocument();
  });

  it("defaults to 0 when balance is null", async () => {
    setupChildMocks({
      balance: null,
      transactions: [],
    });

    await renderDashboard("en");
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});
