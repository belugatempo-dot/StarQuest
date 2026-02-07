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

function buildChainMock(resolvedValue: any = { data: null, error: null }) {
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
}));

jest.mock("@/components/admin/ReportPreferencesForm", () => {
  return function MockReportPreferencesForm({
    familyId,
    preferences,
    parentEmail,
    locale,
  }: any) {
    return (
      <div data-testid="report-preferences-form">
        ReportPreferencesForm - {familyId} - {parentEmail} - {locale}
      </div>
    );
  };
});

import SettingsPage from "@/app/[locale]/(parent)/admin/settings/page";

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page header", async () => {
    const jsx = await SettingsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("settings.title")).toBeInTheDocument();
  });

  it("renders page subtitle", async () => {
    const jsx = await SettingsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("settings.subtitle")).toBeInTheDocument();
  });

  it("renders report preferences section", async () => {
    const jsx = await SettingsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("settings.reportPreferences")).toBeInTheDocument();
    expect(
      screen.getByText("settings.reportPreferencesDescription")
    ).toBeInTheDocument();
  });

  it("renders report preferences form", async () => {
    const jsx = await SettingsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("report-preferences-form")).toBeInTheDocument();
  });

  it("passes correct props to form", async () => {
    const jsx = await SettingsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const form = screen.getByTestId("report-preferences-form");
    expect(form).toHaveTextContent("fam-1");
    expect(form).toHaveTextContent("jane@test.com");
    expect(form).toHaveTextContent("en");
  });

  it("passes empty string as parentEmail when user.email is null", async () => {
    const { requireParent } = require("@/lib/auth");
    requireParent.mockResolvedValueOnce({
      id: "user-1",
      name: "Jane",
      role: "parent",
      family_id: "fam-1",
      email: null,
    });

    const jsx = await SettingsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const form = screen.getByTestId("report-preferences-form");
    // parentEmail should be "" (from user.email || ""), rendered with no space between dashes
    expect(form).toHaveTextContent("ReportPreferencesForm - fam-1 - - en");
  });
});
