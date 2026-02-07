import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InviteParentCard from "@/components/admin/InviteParentCard";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock clipboard
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

// Mock window.open
const mockWindowOpen = jest.fn();
window.open = mockWindowOpen;

describe("InviteParentCard", () => {
  const defaultProps = {
    familyId: "family-123",
    locale: "en",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders email input and create button", () => {
    render(<InviteParentCard {...defaultProps} />);

    expect(screen.getByText("Invite Parent")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address (optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Invitation" })).toBeInTheDocument();
  });

  it("renders description text in English", () => {
    render(<InviteParentCard {...defaultProps} />);

    expect(
      screen.getByText(/Create an invite code to share/)
    ).toBeInTheDocument();
  });

  it("renders bilingual text in Chinese", () => {
    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    expect(screen.getByText("邀请家长")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("邮箱地址（可选）")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建邀请" })).toBeInTheDocument();
    expect(
      screen.getByText(/创建邀请码，通过链接或消息分享给家庭成员/)
    ).toBeInTheDocument();
  });

  it("submits without email (email is optional)", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "ABC123", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/invite-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: "family-123", locale: "en" }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("ABC123")).toBeInTheDocument();
    });
  });

  it("shows error for invalid email when provided", async () => {
    jest.useRealTimers();
    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(screen.getByPlaceholderText("Email address (optional)"), "notanemail");
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows invalid email error in Chinese", async () => {
    jest.useRealTimers();
    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    await userEvent.type(screen.getByPlaceholderText("邮箱地址（可选）"), "bad");
    fireEvent.click(screen.getByRole("button", { name: "创建邀请" }));

    expect(screen.getByText("请输入有效的邮箱地址")).toBeInTheDocument();
  });

  it("shows loading state during creation", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValue(promise);

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    expect(screen.getByPlaceholderText("Email address (optional)")).toBeDisabled();

    // Resolve to avoid unhandled promise
    jest.useRealTimers();
    resolvePromise!({
      ok: true,
      json: async () => ({ success: true, inviteCode: "XYZ", emailSent: false }),
    });
    await waitFor(() => {
      expect(screen.getByText("XYZ")).toBeInTheDocument();
    });
  });

  it("shows invite code and share buttons after successful creation", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "INVITE99", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("Invitation created!")).toBeInTheDocument();
    });

    expect(screen.getByText("INVITE99")).toBeInTheDocument();
    expect(screen.getByText("The invitation expires in 7 days")).toBeInTheDocument();
    expect(screen.getByText("Invite Code")).toBeInTheDocument();

    // Share buttons
    expect(screen.getByRole("button", { name: "Copy Link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share via Email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Another" })).toBeInTheDocument();
  });

  it("shows email sent note when email was provided and sent", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "CODE1", emailSent: true }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Email address (optional)"),
      "spouse@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("Email also sent to spouse@example.com")).toBeInTheDocument();
    });
  });

  it("does not show email sent note when emailSent is false", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "CODE2", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Email address (optional)"),
      "spouse@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("CODE2")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Email also sent/)).not.toBeInTheDocument();
  });

  it("sends email in request body when provided", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "X", emailSent: true }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Email address (optional)"),
      "spouse@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/invite-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: "family-123",
          email: "spouse@example.com",
          locale: "en",
        }),
      });
    });
  });

  it("shows error message on API failure", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: "RPC error: connection failed" }),
    });

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("RPC error: connection failed")).toBeInTheDocument();
    });
  });

  it("shows error on network failure", async () => {
    jest.useRealTimers();
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("resets form when clicking Create Another", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "RESET1", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("RESET1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Another" }));

    expect(screen.getByPlaceholderText("Email address (optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Invitation" })).toBeInTheDocument();
    expect(screen.queryByText("RESET1")).not.toBeInTheDocument();
  });

  it("clears error when user types in email field", async () => {
    jest.useRealTimers();
    render(<InviteParentCard {...defaultProps} />);

    // Type invalid email and submit to get error
    await userEvent.type(screen.getByPlaceholderText("Email address (optional)"), "bad");
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Email address (optional)"), "a");
    expect(screen.queryByText("Please enter a valid email address")).not.toBeInTheDocument();
  });

  it("trims email before sending", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "T1", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Email address (optional)"),
      "  spouse@example.com  "
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/invite-parent",
        expect.objectContaining({
          body: JSON.stringify({
            familyId: "family-123",
            email: "spouse@example.com",
            locale: "en",
          }),
        })
      );
    });
  });

  it("copies registration link to clipboard on Copy Link click", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "COPY1", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("COPY1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy Link" }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining("/en/register?invite=COPY1")
      );
    });
  });

  it("shows Copied! text temporarily after copy", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "COPY2", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("COPY2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy Link" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
    });
  });

  it("opens WhatsApp share URL on WhatsApp click", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "WA1", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("WA1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank"
    );
    // Check that invite code is in the URL
    const url = mockWindowOpen.mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent("WA1"));
  });

  it("opens mailto link on Share via Email click", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "EM1", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Email address (optional)"),
      "test@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("EM1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Share via Email" }));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("mailto:test@example.com?subject="),
      "_blank"
    );
  });

  it("opens mailto without recipient when no email provided", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "EM2", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("EM2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Share via Email" }));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("mailto:?subject="),
      "_blank"
    );
  });

  it("opens WhatsApp share URL with Chinese message in zh-CN locale", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "ZHWA1", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);
    fireEvent.click(screen.getByRole("button", { name: "创建邀请" }));

    await waitFor(() => {
      expect(screen.getByText("ZHWA1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank"
    );
    // Chinese share message should contain the invite code
    const url = mockWindowOpen.mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent("ZHWA1"));
    // Chinese message should be present
    expect(decodeURIComponent(url)).toContain("你被邀请加入StarQuest家庭");
  });

  it("opens mailto link with Chinese content in zh-CN locale", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "ZHEM1", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);
    fireEvent.click(screen.getByRole("button", { name: "创建邀请" }));

    await waitFor(() => {
      expect(screen.getByText("ZHEM1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "通过邮件分享" }));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("mailto:?subject="),
      "_blank"
    );
    const url = mockWindowOpen.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain("加入我的StarQuest家庭");
  });

  it("shows Chinese 'Copied!' text after copy in zh-CN locale", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "ZHCP1", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);
    fireEvent.click(screen.getByRole("button", { name: "创建邀请" }));

    await waitFor(() => {
      expect(screen.getByText("ZHCP1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "复制链接" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "已复制!" })).toBeInTheDocument();
    });
  });

  it("shows Chinese loading state during creation", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValue(promise);

    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    fireEvent.click(screen.getByRole("button", { name: "创建邀请" }));

    expect(screen.getByRole("button", { name: "创建中..." })).toBeDisabled();

    // Resolve to avoid unhandled promise
    jest.useRealTimers();
    resolvePromise!({
      ok: true,
      json: async () => ({ success: true, inviteCode: "XYZ", emailSent: false }),
    });
    await waitFor(() => {
      expect(screen.getByText("XYZ")).toBeInTheDocument();
    });
  });

  it("shows Chinese error on network failure", async () => {
    jest.useRealTimers();
    mockFetch.mockRejectedValueOnce(new Error());

    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    fireEvent.click(screen.getByRole("button", { name: "创建邀请" }));

    await waitFor(() => {
      expect(screen.getByText("创建邀请失败")).toBeInTheDocument();
    });
  });

  it("shows error with data.error when response not ok and data has custom error", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create invitation")).toBeInTheDocument();
    });
  });

  it("shows Chinese fallback error when API response has no error message", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false }),
    });

    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    fireEvent.click(screen.getByRole("button", { name: "创建邀请" }));

    await waitFor(() => {
      expect(screen.getByText("创建邀请失败")).toBeInTheDocument();
    });
  });

  it("handles clipboard failure silently", async () => {
    jest.useRealTimers();
    mockWriteText.mockRejectedValueOnce(new Error("Clipboard denied"));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "CLIPFAIL", emailSent: false }),
    });

    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("CLIPFAIL")).toBeInTheDocument();
    });

    // Should not throw
    fireEvent.click(screen.getByRole("button", { name: "Copy Link" }));

    // Should still show the invite code
    expect(screen.getByText("CLIPFAIL")).toBeInTheDocument();
  });

  describe("Branch coverage", () => {
    it("does not render share buttons when no invite has been created (result is null)", () => {
      render(<InviteParentCard {...defaultProps} />);

      // Verify that share buttons are not present when result is null
      expect(screen.queryByRole("button", { name: "Copy Link" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "WhatsApp" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Share via Email" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Create Another" })).not.toBeInTheDocument();

      // The input and create button should be present instead
      expect(screen.getByPlaceholderText("Email address (optional)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Invitation" })).toBeInTheDocument();
    });
  });

  it("renders result view in Chinese", async () => {
    jest.useRealTimers();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, inviteCode: "ZH1", emailSent: true }),
    });

    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    await userEvent.type(
      screen.getByPlaceholderText("邮箱地址（可选）"),
      "test@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "创建邀请" }));

    await waitFor(() => {
      expect(screen.getByText("邀请已创建！")).toBeInTheDocument();
    });

    expect(screen.getByText("ZH1")).toBeInTheDocument();
    expect(screen.getByText("邀请码")).toBeInTheDocument();
    expect(screen.getByText("邀请码7天内有效")).toBeInTheDocument();
    expect(screen.getByText("邮件已发送至 test@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制链接" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通过邮件分享" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建另一个邀请" })).toBeInTheDocument();
  });
});
