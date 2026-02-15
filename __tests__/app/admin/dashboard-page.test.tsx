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
  chain.then = undefined;
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

jest.mock("@/components/admin/FamilyMemberList", () => {
  return function MockFamilyMemberList({ parents, familyChildren, currentUser, locale }: any) {
    return (
      <div data-testid="family-member-list">
        FamilyMemberList - {parents.length} parents - {familyChildren.length} children
      </div>
    );
  };
});

jest.mock("@/components/admin/ApprovalTabs", () => {
  return function MockApprovalTabs({ starRequests, redemptionRequests, locale, parentId }: any) {
    return (
      <div data-testid="approval-tabs">
        ApprovalTabs - {starRequests.length} stars - {redemptionRequests.length} redemptions - {parentId}
      </div>
    );
  };
});

import AdminDashboard from "@/app/[locale]/(parent)/admin/dashboard/page";

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

  it("renders family members card with anchor link", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Family Members")).toBeInTheDocument();
    // Family Members card links to anchor on same page
    const familyCard = screen.getByText("Family Members").closest("a");
    expect(familyCard).toHaveAttribute("href", "#family-management");
  });

  it("renders pending approvals card with anchor link", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const approvalCard = screen.getByText("admin.pendingApprovals").closest("a");
    expect(approvalCard).toHaveAttribute("href", "#approval-center");
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

  it("renders family management section", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("family.title")).toBeInTheDocument();
    expect(screen.getByText(/family\.subtitle/)).toBeInTheDocument();
    expect(screen.getByTestId("family-member-list")).toBeInTheDocument();
  });

  it("does not render approval tabs when no pending items", async () => {
    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.queryByTestId("approval-tabs")).not.toBeInTheDocument();
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
        return buildChainMock({ data: [], error: null, count: 0 });
      }
      return buildChainMock({ data: [], error: null, count: 0 });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("Alice")).toBeInTheDocument();
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

    expect(screen.getByText("家庭成员")).toBeInTheDocument();
    expect(screen.getByText("信用管理")).toBeInTheDocument();
    expect(screen.getByText("设置额度和利率")).toBeInTheDocument();
    expect(screen.getByText(/家长/)).toBeInTheDocument();
    expect(screen.getByText(/孩子/)).toBeInTheDocument();
  });

  it("shows singular parent/child labels when count is 1 in English", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" },
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

    expect(screen.getByText(/1 parent,/)).toBeInTheDocument();
    expect(screen.getByText(/1 child$/)).toBeInTheDocument();
  });

  it("shows plural parent/child labels when count is > 1 in English", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" },
            { id: "p-2", name: "John", role: "parent", family_id: "fam-1" },
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

    expect(screen.getByText(/2 parents, 2 children/)).toBeInTheDocument();
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

describe("AdminDashboard with approval data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders approval tabs when there are pending requests", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({
          data: [{ id: "st-1", stars: 5, status: "pending" }],
          error: null,
        });
      }
      if (table === "redemptions") {
        return buildChainMock({
          data: [{ id: "rd-1", stars_spent: 10, status: "pending" }],
          error: null,
        });
      }
      return buildChainMock({ data: null, error: null });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("approval-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("approval-tabs")).toHaveTextContent("1 stars");
    expect(screen.getByTestId("approval-tabs")).toHaveTextContent("1 redemptions");
    expect(screen.getByTestId("approval-tabs")).toHaveTextContent("user-1");
    expect(screen.getByText("admin.approvalCenter")).toBeInTheDocument();
  });

  it("passes correct total pending count", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "star_transactions") {
        return buildChainMock({
          data: [{ id: "st-1" }, { id: "st-2" }],
          error: null,
        });
      }
      if (table === "redemptions") {
        return buildChainMock({
          data: [{ id: "rd-1" }],
          error: null,
        });
      }
      return buildChainMock({ data: null, error: null });
    });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // totalPending = 2 stars + 1 redemptions = 3, verify via detail text
    expect(screen.getByText("2 stars, 1 redemptions")).toBeInTheDocument();
  });
});

describe("AdminDashboard with family data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders family name from families table", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");

    const mockAdminFromLocal = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" },
            { id: "c-1", name: "Alice", role: "child", family_id: "fam-1" },
          ],
          error: null,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFromLocal });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "families") {
        return buildChainMock({ data: { id: "fam-1", name: "The Smiths" }, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("The Smiths")).toBeInTheDocument();
  });

  it("passes correct parent and child counts to FamilyMemberList", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");

    const mockAdminFromLocal = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" },
            { id: "p-2", name: "John", role: "parent", family_id: "fam-1" },
            { id: "c-1", name: "Alice", role: "child", family_id: "fam-1" },
            { id: "c-2", name: "Bob", role: "child", family_id: "fam-1" },
            { id: "c-3", name: "Charlie", role: "child", family_id: "fam-1" },
          ],
          error: null,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFromLocal });

    const mockClientFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: null, error: null })
    );
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("family-member-list")).toHaveTextContent("2 parents");
    expect(screen.getByTestId("family-member-list")).toHaveTextContent("3 children");
  });

  it("falls back to regular client when admin returns empty data", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const mockAdminFromLocal = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFromLocal });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" },
            { id: "c-1", name: "Alice", role: "child", family_id: "fam-1" },
          ],
          error: null,
        });
      }
      if (table === "families") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Trying regular client as fallback for members query..."
    );
    expect(screen.getByTestId("family-member-list")).toHaveTextContent("1 parents");
    expect(screen.getByTestId("family-member-list")).toHaveTextContent("1 children");
    consoleSpy.mockRestore();
  });

  it("logs error when admin client fails and falls back", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const mockAdminFromLocal = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: null, error: { message: "RLS error" } });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFromLocal });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "families") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Admin client error fetching family members:",
      { message: "RLS error" }
    );
    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("logs error when family fetch fails", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockAdminFromLocal = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [{ id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" }],
          error: null,
        });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFromLocal });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "families") {
        return buildChainMock({ data: null, error: { message: "Family fetch error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching family:",
      { message: "Family fetch error" }
    );
    consoleSpy.mockRestore();
  });

  it("falls back to regular client and logs found members count", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const mockAdminFromLocal = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: null, error: null });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFromLocal });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" },
          ],
          error: null,
        });
      }
      if (table === "families") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith("Found members using regular client:", 1);
    consoleSpy.mockRestore();
  });

  it("logs error when regular client also fails", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const mockAdminFromLocal = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      if (table === "child_balances") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFromLocal });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: null, error: { message: "Regular client error" } });
      }
      if (table === "families") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await AdminDashboard({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Regular client error fetching family members:",
      { message: "Regular client error" }
    );
    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
