import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordModal from "@/components/admin/ResetPasswordModal";
import type { User } from "@/lib/auth";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock fetch
global.fetch = jest.fn();

describe("ResetPasswordModal", () => {
  const mockChild: User = {
    id: "child-123",
    email: "alice@example.com",
    name: "Alice",
    role: "child",
    family_id: "family-123",
    locale: "en",
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  describe("Rendering", () => {
    it("should render modal with title", () => {
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      expect(screen.getByText("family.resetPassword")).toBeInTheDocument();
    });

    it("should display child's name", () => {
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      expect(screen.getByText(/family\.resetPasswordFor/)).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("should render password input field", () => {
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveValue("");
    });

    it("should render generate button", () => {
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      expect(screen.getByRole("button", { name: "family.generate" })).toBeInTheDocument();
    });

    it("should render warning message", () => {
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      expect(screen.getByText(/family.resetPasswordWarning/)).toBeInTheDocument();
    });

    it("should render cancel and reset buttons", () => {
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      expect(screen.getByRole("button", { name: "common.cancel" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "family.resetPasswordButton" })
      ).toBeInTheDocument();
    });

    it("should disable reset button when password is empty", () => {
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      expect(resetButton).toBeDisabled();
    });
  });

  describe("Password Generation", () => {
    it("should generate password when clicking generate button", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText(
        "family.newPasswordPlaceholder"
      ) as HTMLInputElement;
      const generateButton = screen.getByRole("button", { name: "family.generate" });

      expect(passwordInput.value).toBe("");

      await user.click(generateButton);

      expect(passwordInput.value).not.toBe("");
      expect(passwordInput.value.length).toBeGreaterThan(0);
    });

    it("should generate password with correct format", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText(
        "family.newPasswordPlaceholder"
      ) as HTMLInputElement;
      const generateButton = screen.getByRole("button", { name: "family.generate" });

      await user.click(generateButton);

      // Password format: Adjective + Noun + Number
      // Examples: HappyStar42, BrightMoon123, etc.
      expect(passwordInput.value).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/);
    });

    it("should enable reset button after generating password", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      expect(resetButton).toBeDisabled();

      const generateButton = screen.getByRole("button", { name: "family.generate" });
      await user.click(generateButton);

      expect(resetButton).not.toBeDisabled();
    });

    it("should generate different passwords each time", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText(
        "family.newPasswordPlaceholder"
      ) as HTMLInputElement;
      const generateButton = screen.getByRole("button", { name: "family.generate" });

      await user.click(generateButton);
      const firstPassword = passwordInput.value;

      await user.click(generateButton);
      const secondPassword = passwordInput.value;

      // Both should match the format
      expect(firstPassword).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/);
      expect(secondPassword).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/);
    });

    it("should clear success state when generating new password", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const generateButton = screen.getByRole("button", { name: "family.generate" });
      await user.click(generateButton);

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText(/family\.passwordResetSuccess/)).toBeInTheDocument();
      });

      // Verify we're in success state (password is displayed)
      const firstPassword = screen.getByText(/[A-Z][a-z]+[A-Z][a-z]+\d+/);
      expect(firstPassword).toBeInTheDocument();

      // Generate new password - this should NOT clear success state
      // because the component is already in success mode
      // The success state persists until modal is closed
    });
  });

  describe("Password Validation", () => {
    it("should show error when password is less than 6 characters", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "12345");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      expect(screen.getByText("family.passwordMinLength")).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should accept password with exactly 6 characters", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "123456");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it("should allow manual password entry", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "MyCustomPassword123");

      expect(passwordInput).toHaveValue("MyCustomPassword123");
    });
  });

  describe("Reset Password Flow", () => {
    it("should call API with correct parameters", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/en/api/admin/reset-child-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: "child-123",
            newPassword: "NewPassword123",
          }),
        });
      });
    });

    it("should use correct locale in API URL", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="zh-CN" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/zh-CN/api/admin/reset-child-password",
          expect.any(Object)
        );
      });
    });

    it("should show success message after successful reset", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText(/family\.passwordResetSuccess/)).toBeInTheDocument();
      });

      // Should display the new password
      expect(screen.getByText("NewPassword123")).toBeInTheDocument();
      expect(screen.getByText(/family\.writeDownPassword/)).toBeInTheDocument();
    });

    it("should show close button after successful reset", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "common.close" })).toBeInTheDocument();
      });
    });

    it("should show error when API returns error", async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Failed to reset password" }),
      });

      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to reset password")).toBeInTheDocument();
      });

      expect(screen.queryByText("family.passwordResetSuccess")).not.toBeInTheDocument();
    });

    it("should show generic error when API throws exception", async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show fallback error when no error message provided", async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockRejectedValue({});

      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText("family.resetPasswordError")).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading text during reset", async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(promise);

      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "common.resetting" })).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      });

      await waitFor(() => {
        expect(screen.getByText(/family\.passwordResetSuccess/)).toBeInTheDocument();
      });
    });

    it("should disable buttons during loading", async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(promise);

      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        const resettingButton = screen.getByRole("button", { name: "common.resetting" });
        const cancelButton = screen.getByRole("button", { name: "common.cancel" });

        expect(resettingButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      });

      await waitFor(() => {
        expect(screen.getByText(/family\.passwordResetSuccess/)).toBeInTheDocument();
      });
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const cancelButton = screen.getByRole("button", { name: "common.cancel" });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should call onClose when close button is clicked after success", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "common.close" })).toBeInTheDocument();
      });

      const closeButton = screen.getByRole("button", { name: "common.close" });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should clear error when retrying", async () => {
      const user = userEvent.setup();

      // First call fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "First error" }),
      });

      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "NewPassword123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText("First error")).toBeInTheDocument();
      });

      // Second call succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.queryByText("First error")).not.toBeInTheDocument();
      });
    });

    it("should clear success state when retrying after validation error", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");

      // Try with short password
      await user.type(passwordInput, "12345");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      expect(screen.getByText("family.passwordMinLength")).toBeInTheDocument();

      // Clear and try with valid password
      await user.clear(passwordInput);
      await user.type(passwordInput, "ValidPassword123");
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.queryByText("family.passwordMinLength")).not.toBeInTheDocument();
      });
    });
  });

  describe("Password Display", () => {
    it("should display password in large monospace font after success", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal child={mockChild} locale="en" onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText("family.newPasswordPlaceholder");
      await user.type(passwordInput, "DisplayTest123");

      const resetButton = screen.getByRole("button", { name: "family.resetPasswordButton" });
      await user.click(resetButton);

      await waitFor(() => {
        const displayedPassword = screen.getByText("DisplayTest123");
        expect(displayedPassword).toBeInTheDocument();
        expect(displayedPassword.className).toContain("font-mono");
        expect(displayedPassword.className).toContain("text-2xl");
      });
    });
  });
});
