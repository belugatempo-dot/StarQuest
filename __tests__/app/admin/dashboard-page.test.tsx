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

jest.mock("@/lib/auth", () => ({
  requireParent: jest.fn().mockResolvedValue({
    id: "user-1",
    name: "Jane",
    role: "parent",
    family_id: "fam-1",
    email: "jane@test.com",
  }),
}));

// Build chain mock helper
function buildChainMock(resolvedValue: any = { data: [], error: null }) {
  const chain: any = {};
  const methods = ["select", "eq", "order", "limit", "single", "maybeSingle", "or", "neq", "in", "gte", "lte"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  // Terminal calls return the resolved value
  chain.then = undefined;
  // Make the chain itself awaitable by making it a thenable
  Object.defineProperty(chain, "then", {
    value: (resolve: any) => resolve(resolvedValue),
    writable: true,
    configurable: true,
  });
  return chain;
}

const mockSupabaseFrom = jest.fn().mockImplementation(() => buildChainMock({ data: [], error: null, count: 0 }));
const mockAdminFrom = jest.fn().mockImplementation(() => buildChainMock({ data: [], error: null, count: 0 }));

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
    return <div data-testid="invite-parent-card">InviteParentCard</div>;
  };
});

import AdminDashboard from "@/app/[locale]/(parent)/admin/page";

describe("AdminDashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders welcome header with user name", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Welcome, Jane!/)).toBeInTheDocument();
  });

  it("renders pending approvals card", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("admin.pendingApprovals")).toBeInTheDocument();
  });

  it("renders family members card", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Family Members")).toBeInTheDocument();
  });

  it("renders quick record card", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Quick Record")).toBeInTheDocument();
    expect(screen.getByText("admin.recordStars")).toBeInTheDocument();
  });

  it("renders credit management card", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Credit Management")).toBeInTheDocument();
  });

  it("renders invite parent card", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("invite-parent-card")).toBeInTheDocument();
  });

  it("renders children overview with empty state", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Children Overview")).toBeInTheDocument();
    expect(screen.getByText("No children added yet")).toBeInTheDocument();
  });

  it("renders Add Child link in empty state", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const addChildLink = screen.getByText("Add Child");
    expect(addChildLink.closest("a")).toHaveAttribute("href", "/en/admin/family");
  });

  it("renders children when data is present with balance found", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "child-1", name: "Alice", avatar_url: null, role: "child", family_id: "fam-1" },
            { id: "child-2", name: "Bob", avatar_url: "😎", role: "child", family_id: "fam-1" },
          ],
          error: null,
          count: 2,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({
          data: [
            { child_id: "child-1", current_stars: 50, lifetime_stars: 120 },
            { child_id: "child-2", current_stars: 30, lifetime_stars: 80 },
          ],
          error: null,
          count: 0,
        });
      }
      return buildChainMock({ data: [], error: null, count: 0 });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("No children added yet")).not.toBeInTheDocument();
    // Check balances are shown
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("renders children with missing balance (falls back to 0)", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "child-1", name: "Alice", avatar_url: null, role: "child", family_id: "fam-1" },
          ],
          error: null,
          count: 1,
        });
      }
      if (table === "child_balances") {
        // No balances at all
        return buildChainMock({ data: [], error: null, count: 0 });
      }
      return buildChainMock({ data: [], error: null, count: 0 });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    // Fallback "0" values for current_stars and lifetime_stars
    const levelTexts = screen.getAllByText("Level 0");
    expect(levelTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Chinese labels for zh-CN locale", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "child-1", name: "Alice", avatar_url: "🌟", role: "child", family_id: "fam-1" },
          ],
          error: null,
          count: 1,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({
          data: [
            { child_id: "child-1", current_stars: 50, lifetime_stars: 120 },
          ],
          error: null,
          count: 0,
        });
      }
      return buildChainMock({ data: [], error: null, count: 0 });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    // zh-CN specific text
    expect(screen.getByText("家庭成员")).toBeInTheDocument();
    expect(screen.getByText("信用管理")).toBeInTheDocument();
    expect(screen.getByText("设置额度和利率")).toBeInTheDocument();
    // zh-CN parent/child count labels
    expect(screen.getByText(/家长/)).toBeInTheDocument();
    expect(screen.getByText(/孩子/)).toBeInTheDocument();
  });

  it("shows singular parent/child labels when count is 1 in English", async () => {
    mockSupabaseFrom.mockImplementation(() => buildChainMock({ data: [], error: null, count: 1 }));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "child-1", name: "Alice", avatar_url: null, role: "child", family_id: "fam-1" },
          ],
          error: null,
          count: 1,
        });
      }
      return buildChainMock({ data: [], error: null, count: 0 });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // parentsCount=1 => "parent", childrenCount=1 => "child"
    expect(screen.getByText(/1 parent,/)).toBeInTheDocument();
    expect(screen.getByText(/1 child$/)).toBeInTheDocument();
  });

  it("shows plural parent/child labels when count is > 1 in English", async () => {
    mockSupabaseFrom.mockImplementation(() => buildChainMock({ data: [], error: null, count: 0 }));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "child-1", name: "Alice", avatar_url: null, role: "child", family_id: "fam-1" },
            { id: "child-2", name: "Bob", avatar_url: null, role: "child", family_id: "fam-1" },
          ],
          error: null,
          count: 2,
        });
      }
      return buildChainMock({ data: [], error: null, count: 0 });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // parentsCount=2 (from count), childrenCount=2 => "parents", "children"
    expect(screen.getByText(/parents,/)).toBeInTheDocument();
    expect(screen.getByText(/children$/)).toBeInTheDocument();
  });

  it("renders child avatar_url when set", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "child-1", name: "Alice", avatar_url: "🌟", role: "child", family_id: "fam-1" },
          ],
          error: null,
          count: 1,
        });
      }
      return buildChainMock({ data: [], error: null, count: 0 });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("🌟")).toBeInTheDocument();
  });

  it("renders default avatar when avatar_url is null", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "child-1", name: "Alice", avatar_url: null, role: "child", family_id: "fam-1" },
          ],
          error: null,
          count: 1,
        });
      }
      return buildChainMock({ data: [], error: null, count: 0 });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("👤")).toBeInTheDocument();
  });
});
