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

jest.mock("@/components/admin/ApprovalTabs", () => {
  return function MockApprovalTabs({ starRequests, redemptionRequests, locale, parentId }: any) {
    return (
      <div data-testid="approval-tabs">
        ApprovalTabs - {starRequests.length} stars - {redemptionRequests.length} redemptions - {parentId}
      </div>
    );
  };
});

import ApprovalCenterPage from "@/app/[locale]/(parent)/admin/approve/page";

describe("ApprovalCenterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await ApprovalCenterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("admin.approvalCenter")).toBeInTheDocument();
  });

  it("renders pending approvals count", async () => {
    const jsx = await ApprovalCenterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("admin.pendingApprovals")).toBeInTheDocument();
  });

  it("renders approval tabs component", async () => {
    const jsx = await ApprovalCenterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("approval-tabs")).toBeInTheDocument();
  });

  it("passes parentId to ApprovalTabs", async () => {
    const jsx = await ApprovalCenterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("approval-tabs")).toHaveTextContent("user-1");
  });

  it("shows total pending count of 0 when no requests", async () => {
    const jsx = await ApprovalCenterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // totalPending is 0 when both arrays are empty
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("falls back to empty arrays when data is null", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockResolvedValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({ data: null, error: null })
      ),
    });

    const jsx = await ApprovalCenterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // starRequests || [] and redemptionRequests || [] fallbacks
    expect(screen.getByTestId("approval-tabs")).toHaveTextContent("0 stars");
    expect(screen.getByTestId("approval-tabs")).toHaveTextContent("0 redemptions");
  });
});
