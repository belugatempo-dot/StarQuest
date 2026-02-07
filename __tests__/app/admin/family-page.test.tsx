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
    email: "jane@test.com",
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
    from: jest.fn().mockImplementation(() => buildChainMock({ data: null, error: null })),
  }),
  createAdminClient: jest.fn().mockReturnValue({
    from: jest.fn().mockImplementation(() => buildChainMock({ data: [], error: null })),
  }),
}));

jest.mock("@/components/admin/FamilyMemberList", () => {
  return function MockFamilyMemberList({ parents, children, currentUser, locale }: any) {
    return (
      <div data-testid="family-member-list">
        FamilyMemberList - {parents.length} parents - {children.length} children
      </div>
    );
  };
});

import FamilyManagementPage from "@/app/[locale]/(parent)/admin/family/page";

describe("FamilyManagementPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await FamilyManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("family.title")).toBeInTheDocument();
  });

  it("renders family subtitle", async () => {
    const jsx = await FamilyManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/family\.subtitle/)).toBeInTheDocument();
  });

  it("renders family member list component", async () => {
    const jsx = await FamilyManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("family-member-list")).toBeInTheDocument();
  });
});

describe("FamilyManagementPage with data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders family name from families table", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");

    // Admin client returns members
    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [
            { id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" },
            { id: "c-1", name: "Alice", role: "child", family_id: "fam-1" },
          ],
          error: null,
        });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    // Regular client returns family info
    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "families") {
        return buildChainMock({ data: { id: "fam-1", name: "The Smiths" }, error: null });
      }
      // Regular client should NOT be called for users since admin already returned data
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await FamilyManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("The Smiths")).toBeInTheDocument();
  });

  it("passes correct parent and child counts to FamilyMemberList", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");

    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
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
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const mockClientFrom = jest.fn().mockImplementation(() =>
      buildChainMock({ data: null, error: null })
    );
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await FamilyManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("family-member-list")).toHaveTextContent("2 parents");
    expect(screen.getByTestId("family-member-list")).toHaveTextContent("3 children");
  });

  it("falls back to regular client when admin returns empty data", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Admin returns empty array
    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    // Regular client returns members
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
      return buildChainMock({ data: null, error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await FamilyManagementPage({
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

    // Admin returns error
    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: null, error: { message: "RLS error" } });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    // Regular client also returns no data
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

    const jsx = await FamilyManagementPage({
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

    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({
          data: [{ id: "p-1", name: "Jane", role: "parent", family_id: "fam-1" }],
          error: null,
        });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    const mockClientFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "families") {
        return buildChainMock({ data: null, error: { message: "Family fetch error" } });
      }
      return buildChainMock({ data: [], error: null });
    });
    createClient.mockResolvedValue({ from: mockClientFrom });

    const jsx = await FamilyManagementPage({
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

    // Admin returns null (not empty array, but null members)
    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: null, error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

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

    const jsx = await FamilyManagementPage({
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

    // Admin returns empty
    const mockAdminFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return buildChainMock({ data: [], error: null });
      }
      return buildChainMock({ data: null, error: null });
    });
    createAdminClient.mockReturnValue({ from: mockAdminFrom });

    // Regular client returns error
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

    const jsx = await FamilyManagementPage({
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
