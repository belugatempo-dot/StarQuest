import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InviteParentCard from "@/components/admin/InviteParentCard";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("InviteParentCard", () => {
  const defaultProps = {
    familyId: "family-123",
    locale: "en",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders email input and send button", () => {
    render(<InviteParentCard {...defaultProps} />);

    expect(screen.getByText("Invite Parent")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Invitation" })).toBeInTheDocument();
  });

  it("renders description text in English", () => {
    render(<InviteParentCard {...defaultProps} />);

    expect(
      screen.getByText(/Enter your spouse or family member's email/)
    ).toBeInTheDocument();
  });

  it("renders bilingual text in Chinese", () => {
    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    expect(screen.getByText("邀请家长")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入邮箱地址")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送邀请" })).toBeInTheDocument();
    expect(
      screen.getByText(/输入配偶或家庭成员的邮箱地址/)
    ).toBeInTheDocument();
  });

  it("shows error for empty email", async () => {
    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    expect(screen.getByText("Please enter an email address")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error for invalid email", async () => {
    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(screen.getByPlaceholderText("Enter email address"), "notanemail");
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows empty email error in Chinese", async () => {
    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    fireEvent.click(screen.getByRole("button", { name: "发送邀请" }));

    expect(screen.getByText("请输入邮箱地址")).toBeInTheDocument();
  });

  it("shows invalid email error in Chinese", async () => {
    render(<InviteParentCard {...defaultProps} locale="zh-CN" />);

    await userEvent.type(screen.getByPlaceholderText("输入邮箱地址"), "bad");
    fireEvent.click(screen.getByRole("button", { name: "发送邀请" }));

    expect(screen.getByText("请输入有效的邮箱地址")).toBeInTheDocument();
  });

  it("shows loading state during send", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValue(promise);

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter email address"),
      "spouse@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
    expect(screen.getByPlaceholderText("Enter email address")).toBeDisabled();

    // Resolve to avoid unhandled promise
    resolvePromise!({
      ok: true,
      json: async () => ({ success: true }),
    });
    await waitFor(() => {
      expect(screen.getByText(/Invitation sent to/)).toBeInTheDocument();
    });
  });

  it("shows success message after successful send", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter email address"),
      "spouse@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(
        screen.getByText("Invitation sent to spouse@example.com")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("The invitation expires in 7 days")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Another" })).toBeInTheDocument();
  });

  it("sends correct request body to API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter email address"),
      "spouse@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

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
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: "Failed to send invitation email" }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter email address"),
      "spouse@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to send invitation email")).toBeInTheDocument();
    });
  });

  it("shows error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter email address"),
      "test@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("resets form when clicking Send Another", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter email address"),
      "spouse@example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(screen.getByText(/Invitation sent to/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Another" }));

    expect(screen.getByPlaceholderText("Enter email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Invitation" })).toBeInTheDocument();
    expect(screen.queryByText(/Invitation sent to/)).not.toBeInTheDocument();
  });

  it("clears error when user types in email field", async () => {
    render(<InviteParentCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));
    expect(screen.getByText("Please enter an email address")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Enter email address"), "a");
    expect(screen.queryByText("Please enter an email address")).not.toBeInTheDocument();
  });

  it("trims email before sending", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<InviteParentCard {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter email address"),
      "  spouse@example.com  "
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

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
});
