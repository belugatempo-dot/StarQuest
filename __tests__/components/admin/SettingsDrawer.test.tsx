import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock Supabase client
const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
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

import SettingsDrawer from "@/components/admin/SettingsDrawer";

describe("SettingsDrawer", () => {
  const defaultProps = {
    familyId: "fam-1",
    parentEmail: "jane@test.com",
    locale: "en",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("renders gear button", () => {
    render(<SettingsDrawer {...defaultProps} />);
    expect(screen.getByLabelText("admin.settings")).toBeInTheDocument();
  });

  it("drawer is closed initially", () => {
    render(<SettingsDrawer {...defaultProps} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens drawer on gear click", async () => {
    render(<SettingsDrawer {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("settings.title")).toBeInTheDocument();
  });

  it("fetches preferences on first open", async () => {
    render(<SettingsDrawer {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });

    expect(mockFrom).toHaveBeenCalledWith("family_report_preferences");
    expect(screen.getByTestId("report-preferences-form")).toBeInTheDocument();
  });

  it("renders report preferences form with correct props", async () => {
    render(<SettingsDrawer {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });

    const form = screen.getByTestId("report-preferences-form");
    expect(form).toHaveTextContent("fam-1");
    expect(form).toHaveTextContent("jane@test.com");
    expect(form).toHaveTextContent("en");
  });

  it("closes drawer on backdrop click", async () => {
    render(<SettingsDrawer {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes drawer on Escape key", async () => {
    render(<SettingsDrawer {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes drawer on X button click", async () => {
    render(<SettingsDrawer {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders settings subtitle and report section headings", async () => {
    render(<SettingsDrawer {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });

    expect(screen.getByText("settings.subtitle")).toBeInTheDocument();
    expect(screen.getByText("settings.reportPreferences")).toBeInTheDocument();
    expect(screen.getByText("settings.reportPreferencesDescription")).toBeInTheDocument();
  });

  it("does not re-fetch preferences on subsequent opens", async () => {
    render(<SettingsDrawer {...defaultProps} />);

    // First open
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });
    expect(mockFrom).toHaveBeenCalledTimes(1);

    // Close
    fireEvent.click(screen.getByLabelText("Close"));

    // Second open
    await act(async () => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });
    // Should not fetch again
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("shows loading spinner while fetching", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockMaybeSingle.mockReturnValue(promise);

    render(<SettingsDrawer {...defaultProps} />);

    // Open (don't await since the promise won't resolve yet)
    act(() => {
      fireEvent.click(screen.getByLabelText("admin.settings"));
    });

    // Should show loading spinner
    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("report-preferences-form")).not.toBeInTheDocument();

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ data: null, error: null });
    });

    // Should now show the form
    expect(screen.queryByTestId("settings-loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("report-preferences-form")).toBeInTheDocument();
  });
});
