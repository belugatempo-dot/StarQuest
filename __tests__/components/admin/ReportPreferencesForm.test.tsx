import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportPreferencesForm from "@/components/admin/ReportPreferencesForm";

// Mock Supabase client
const mockFrom = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe("ReportPreferencesForm", () => {
  const defaultProps = {
    familyId: "family-123",
    preferences: null,
    parentEmail: "parent@example.com",
    locale: "en",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
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

  it("submits form with insert for new preferences", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      insert: mockInsert,
    });

    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          family_id: "family-123",
          weekly_report_enabled: true,
          monthly_report_enabled: true,
          settlement_email_enabled: true,
        })
      );
    });
  });

  it("submits form with update for existing preferences", async () => {
    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
    });

    const preferences = {
      id: "pref-123",
      family_id: "family-123",
      report_email: null,
      weekly_report_enabled: true,
      monthly_report_enabled: true,
      settlement_email_enabled: true,
      timezone: "UTC",
      report_locale: "en" as const,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    };

    const user = userEvent.setup();
    render(
      <ReportPreferencesForm {...defaultProps} preferences={preferences} />
    );

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "pref-123");
    });
  });

  it("shows success message after successful save", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/saveSuccess/i)).toBeInTheDocument();
    });
  });

  it("shows error message on save failure", async () => {
    mockFrom.mockReturnValue({
      insert: jest
        .fn()
        .mockResolvedValue({ error: { message: "Database error" } }),
    });

    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/saveError/i)).toBeInTheDocument();
    });
  });

  it("disables submit button while saving", async () => {
    let resolveInsert: (value: { error: null }) => void;
    const insertPromise = new Promise<{ error: null }>((resolve) => {
      resolveInsert = resolve;
    });
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue(insertPromise),
    });

    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/saving/i);

    resolveInsert!({ error: null });

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
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      insert: mockInsert,
    });

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
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          report_email: "custom@test.com",
          timezone: "Asia/Tokyo",
          report_locale: "zh-CN",
          settlement_email_enabled: false,
          weekly_report_enabled: true,
          monthly_report_enabled: true,
        })
      );
    });
  });

  it("trims email and sends null when empty", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      insert: mockInsert,
    });

    const user = userEvent.setup();
    render(<ReportPreferencesForm {...defaultProps} />);

    // Submit with empty email
    const submitButton = screen.getByRole("button", { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          report_email: null,
        })
      );
    });
  });
});
