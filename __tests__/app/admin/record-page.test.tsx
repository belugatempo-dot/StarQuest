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
  createAdminClient: jest.fn().mockReturnValue({
    from: jest.fn().mockImplementation(() => buildChainMock({ data: [], error: null })),
  }),
}));

jest.mock("@/components/admin/QuickRecordForm", () => {
  return function MockQuickRecordForm({ children, quests, locale, parentId, familyId }: any) {
    return (
      <div data-testid="quick-record-form">
        QuickRecordForm - {locale} - {parentId} - {familyId}
      </div>
    );
  };
});

import RecordStarsPage from "@/app/[locale]/(parent)/admin/record/page";

describe("RecordStarsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await RecordStarsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("admin.recordStars")).toBeInTheDocument();
  });

  it("renders quick record form", async () => {
    const jsx = await RecordStarsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("quick-record-form")).toBeInTheDocument();
  });

  it("passes correct props to QuickRecordForm", async () => {
    const jsx = await RecordStarsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const form = screen.getByTestId("quick-record-form");
    expect(form).toHaveTextContent("en");
    expect(form).toHaveTextContent("user-1");
    expect(form).toHaveTextContent("fam-1");
  });

  it("renders how it works info section", async () => {
    const jsx = await RecordStarsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/How it works/)).toBeInTheDocument();
    expect(screen.getByText(/Select a child/)).toBeInTheDocument();
  });

  it("falls back to empty arrays when children and quests data is null", async () => {
    const { createClient, createAdminClient } = require("@/lib/supabase/server");
    createClient.mockResolvedValueOnce({
      from: jest.fn().mockImplementation(() => buildChainMock({ data: null, error: null })),
    });
    createAdminClient.mockReturnValueOnce({
      from: jest.fn().mockImplementation(() => buildChainMock({ data: null, error: null })),
    });

    const jsx = await RecordStarsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    // Should still render without error (children || [] and quests || [] fallbacks)
    expect(screen.getByTestId("quick-record-form")).toBeInTheDocument();
  });
});
