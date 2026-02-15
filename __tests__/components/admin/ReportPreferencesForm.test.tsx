import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportPreferencesForm from "@/components/admin/ReportPreferencesForm";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ReportPreferencesForm", () => {
  const defaultProps = {
    familyId: "family-123",
    preferences: null,
    parentEmail: "parent@example.com",
    locale: "en",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it("renders all form fields", () => {
    render(<ReportPreferencesForm {...defaultProps} />);

    expect(screen.getByLabelText(/emailOverride/i)).toBeInTheDocument();
    expect(screen.getByText(/weeklyReport$/i)).toBeInTheDocument();
    expect(screen.getByText(/monthlyReport$/i)).toBeInTheDocument();
    expect(screen.getByText(/settlementEmail$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reportLanguage/i)).toBeInTheDocument();
  });

  it("shows parent email as placeholder when no override", () => {
    render(<ReportPreferencesForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/emailOverride/i);
    expect(emailInput).toHaveAttribute("placeholder", "parent@example.com");
  });

  it("shows translation key as placeholder when parentEmail is empty", () => {
    render(<ReportPreferencesForm {...defaultProps} parentEmail="" />);

    const emailInput = screen.getByLabelText(/emailOverride/i);
    // When parentEmail is empty, it should fall back to t("emailPlaceholder")
    expect(emailInput).toHaveAttribute("placeholder", "emailPlaceholder");
  });

  it("populates form with existing preferences", () => {
    const preferences = {
      id: "pref-123",
      family_id: "family-123",
      report_email: "other@example.com",
      weekly_report_enabled: false,
      monthly_report_enabled: true,
      settlement_email_enabled: false,
      timezone: "America/New_York",
      report_locale: "zh-CN" as const,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    };

    render(
      <ReportPreferencesForm {...defaultProps} preferences={preferences} />
    );

    expect(screen.getByLabelText(/emailOverride/i)).toHaveValue(
      "other@example.com"
    );
    expect(screen.getByLabelText(/timezone/i)).toHaveValue("America/New_York");
    expect(screen.getByLabelText(/reportLanguage/i)).toHaveValue("zh-CN");
  });

  it("all toggles are enabled by default when no preferences", () => {
    render(<ReportPreferencesForm {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it("can toggle weekly report checkbox", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const weeklyCheckbox = screen.getAllByRole("checkbox")[0];
    expect(weeklyCheckbox).toBeChecked();

    await user.click(weeklyCheckbox);
    expect(weeklyCheckbox).not.toBeChecked();
  });

  it("submits form via fetch to API route", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/en/api/admin/update-report-preferences",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        })
      );
    });

    // Verify the body content
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody).toEqual(
      expect.objectContaining({
        familyId: "family-123",
        weeklyReportEnabled: true,
        monthlyReportEnabled: true,
        settlementEmailEnabled: true,
      })
    );
  });

  it("uses correct locale in API URL", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} locale="zh-CN" />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/zh-CN/api/admin/update-report-preferences",
        expect.any(Object)
      );
    });
  });

  it("shows success message after successful save", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/saveSuccess/i)).toBeInTheDocument();
    });
  });

  it("shows error message on save failure (non-ok response)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Database error" }),
    });

    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/saveError/i)).toBeInTheDocument();
    });
  });

  it("shows error message on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/saveError/i)).toBeInTheDocument();
    });
  });

  it("disables submit button while saving", async () => {
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    mockFetch.mockReturnValue(fetchPromise);

    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/saving/i);

    resolveFetch!({
      ok: true,
      json: async () => ({ success: true }),
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("uses current locale for default report language when no preferences", () => {
    render(<ReportPreferencesForm {...defaultProps} locale="zh-CN" />);

    expect(screen.getByLabelText(/reportLanguage/i)).toHaveValue("zh-CN");
  });

  it("can change email override", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/emailOverride/i);
    await user.clear(emailInput);
    await user.type(emailInput, "new@example.com");
    expect(emailInput).toHaveValue("new@example.com");
  });

  it("can toggle monthly report checkbox", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const monthlyCheckbox = checkboxes[1]; // weekly=0, monthly=1, settlement=2
    expect(monthlyCheckbox).toBeChecked();

    await user.click(monthlyCheckbox);
    expect(monthlyCheckbox).not.toBeChecked();
  });

  it("can toggle settlement email checkbox", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const settlementCheckbox = checkboxes[2];
    expect(settlementCheckbox).toBeChecked();

    await user.click(settlementCheckbox);
    expect(settlementCheckbox).not.toBeChecked();
  });

  it("can change timezone", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const timezoneSelect = screen.getByLabelText(/timezone/i);
    await user.selectOptions(timezoneSelect, "Asia/Shanghai");
    expect(timezoneSelect).toHaveValue("Asia/Shanghai");
  });

  it("can change report language", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const localeSelect = screen.getByLabelText(/reportLanguage/i);
    expect(localeSelect).toHaveValue("en");

    await user.selectOptions(localeSelect, "zh-CN");
    expect(localeSelect).toHaveValue("zh-CN");
  });

  it("submits form with modified values", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    // Modify email
    const emailInput = screen.getByLabelText(/emailOverride/i);
    await user.type(emailInput, "custom@test.com");

    // Change timezone
    const timezoneSelect = screen.getByLabelText(/timezone/i);
    await user.selectOptions(timezoneSelect, "Asia/Tokyo");

    // Change locale
    const localeSelect = screen.getByLabelText(/reportLanguage/i);
    await user.selectOptions(localeSelect, "zh-CN");

    // Toggle off settlement email
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[2]);

    // Submit
    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toEqual(
        expect.objectContaining({
          reportEmail: "custom@test.com",
          timezone: "Asia/Tokyo",
          reportLocale: "zh-CN",
          settlementEmailEnabled: false,
          weeklyReportEnabled: true,
          monthlyReportEnabled: true,
        })
      );
    });
  });

  it("trims email and sends null when empty", async () => {
    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    // Submit with empty email
    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.reportEmail).toBeNull();
    });
  });
});
