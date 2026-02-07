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
  createAdminClient: jest.fn().mockReturnValue({
    from: jest.fn().mockImplementation(() =>
      buildChainMock({ data: [], error: null, settlement_day: 1 })
    ),
  }),
}));

jest.mock("@/app/[locale]/(parent)/admin/credit/CreditManagementClient", () => {
  return function MockCreditManagementClient({
    familyId,
    children,
    balances,
    creditSettings,
    settlementDay,
    locale,
  }: any) {
    return (
      <div data-testid="credit-management-client">
        CreditManagementClient - {familyId} - settlement: {settlementDay} - {locale}
      </div>
    );
  };
});

import CreditManagementPage from "@/app/[locale]/(parent)/admin/credit/page";

describe("CreditManagementPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await CreditManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/credit\.pageTitle/)).toBeInTheDocument();
  });

  it("renders page description", async () => {
    const jsx = await CreditManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("credit.pageDescription")).toBeInTheDocument();
  });

  it("renders credit management client component", async () => {
    const jsx = await CreditManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("credit-management-client")).toBeInTheDocument();
  });

  it("passes correct familyId to client component", async () => {
    const jsx = await CreditManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("credit-management-client")).toHaveTextContent(
      "fam-1"
    );
  });

  it("falls back to empty arrays when data is null", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    createAdminClient.mockReturnValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({ data: null, error: null })
      ),
    });

    const jsx = await CreditManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // children || [], balances || [], creditSettings || [] fallbacks
    expect(screen.getByTestId("credit-management-client")).toBeInTheDocument();
  });

  it("falls back to settlement day 1 when familySettings is null", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    createAdminClient.mockReturnValueOnce({
      from: jest.fn().mockImplementation(() =>
        buildChainMock({ data: null, error: null })
      ),
    });

    const jsx = await CreditManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // familySettings?.settlement_day || 1 => 1
    expect(screen.getByTestId("credit-management-client")).toHaveTextContent(
      "settlement: 1"
    );
  });

  it("uses actual settlement day when available", async () => {
    const { createAdminClient } = require("@/lib/supabase/server");
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === "families") {
        return buildChainMock({ data: { settlement_day: 15 }, error: null });
      }
      return buildChainMock({ data: [], error: null });
    });
    createAdminClient.mockReturnValueOnce({ from: mockFrom });

    const jsx = await CreditManagementPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("credit-management-client")).toHaveTextContent(
      "settlement: 15"
    );
  });
});
