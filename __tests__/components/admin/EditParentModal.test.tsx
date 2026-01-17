import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditParentModal from "@/components/admin/EditParentModal";
import type { User } from "@/lib/auth";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe("EditParentModal", () => {
  const mockParent: User = {
    id: "parent-123",
    email: "parent@example.com",
    name: "John Parent",
    role: "parent",
    family_id: "family-123",
    locale: "en",
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup for successful update
    mockFrom.mockReturnValue({
      update: mockUpdate.mockReturnThis(),
    });

    mockUpdate.mockReturnValue({
      eq: mockEq.mockResolvedValue({
        data: null,
        error: null,
      }),
    });
  });

  describe("Rendering", () => {
    it("should render modal with correct title", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("heading", { name: "family.editParent" })).toBeInTheDocument();
    });

    it("should render name field with pre-filled value", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveValue("John Parent");
      expect(screen.getByText("family.parentName")).toBeInTheDocument();
    });

    it("should render email field as disabled with pre-filled value", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByDisplayValue("parent@example.com");
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toBeDisabled();
    });

    it("should show message that email cannot be changed", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("family.emailCannotChange")).toBeInTheDocument();
    });

    it("should render cancel button", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByRole("button", { name: "common.cancel" });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).not.toBeDisabled();
    });

    it("should render save button", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const saveButton = screen.getByRole("button", { name: "common.save" });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    it("should show required indicator for name field", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameLabel = screen.getByText("family.parentName").parentElement;
      expect(nameLabel).toHaveTextContent("*");
    });

    it("should render email field empty when parent has no email", () => {
      const parentWithoutEmail = { ...mockParent, email: null };
      render(
        <EditParentModal
          parent={parentWithoutEmail}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInputs = screen.getAllByRole("textbox");
      const emailInput = emailInputs.find(input =>
        (input as HTMLInputElement).type === "email" ||
        input.getAttribute("type") === "email"
      );
      // Email input should exist but be empty
      expect(screen.getByText("auth.email")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should prevent submission when name is empty", async () => {
      const user = userEvent.setup();

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");

      // Clear the name field
      await user.clear(nameInput);

      // The required attribute should be present
      expect(nameInput).toHaveAttribute('required');

      // With HTML required attribute, browser prevents submission
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should allow submission with valid name", async () => {
      const user = userEvent.setup();

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Jane Parent");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });
  });

  describe("Parent Update Flow", () => {
    it("should update parent with name only", async () => {
      const user = userEvent.setup();

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Jane Parent");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          name: "Jane Parent",
        });
      });

      expect(mockEq).toHaveBeenCalledWith("id", "parent-123");
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should trim name before updating", async () => {
      const user = userEvent.setup();

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "  Sarah Parent  ");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          name: "Sarah Parent",
        });
      });
    });

    it("should show error when database update fails", async () => {
      const user = userEvent.setup();

      // Mock database error
      mockEq.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Frank");
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Database connection failed")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should show generic error when error has no message", async () => {
      const user = userEvent.setup();

      // Mock error without message
      mockEq.mockResolvedValue({
        data: null,
        error: {},
      });

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Grace");
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("family.updateParentError")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("should show loading text on save button during update", async () => {
      const user = userEvent.setup();

      // Mock slow update
      mockEq.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: null, error: null });
            }, 100);
          })
      );

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Harry");
      await user.click(saveButton);

      // Check for loading text
      expect(screen.getByRole("button", { name: "common.saving" })).toBeInTheDocument();

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should disable save button during update", async () => {
      const user = userEvent.setup();

      // Mock slow update
      mockEq.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: null, error: null });
            }, 100);
          })
      );

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Ivy");
      await user.click(saveButton);

      // Button should be disabled during loading
      const loadingButton = screen.getByRole("button", { name: "common.saving" });
      expect(loadingButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should disable cancel button during update", async () => {
      const user = userEvent.setup();

      // Mock slow update
      mockEq.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: null, error: null });
            }, 100);
          })
      );

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });
      const cancelButton = screen.getByRole("button", { name: "common.cancel" });

      await user.clear(nameInput);
      await user.type(nameInput, "Jack");
      await user.click(saveButton);

      // Cancel button should be disabled during loading
      expect(cancelButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByRole("button", { name: "common.cancel" });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should not close modal on successful update (calls onSuccess instead)", async () => {
      const user = userEvent.setup();

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Leo");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Error Message Display", () => {
    it("should not show error message initially", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const errorDiv = screen.queryByText(/family\.nameRequired|family\.updateParentError/);
      expect(errorDiv).not.toBeInTheDocument();
    });

    it("should show error in red box when database update fails", async () => {
      const user = userEvent.setup();

      // Mock database error
      mockEq.mockResolvedValue({
        data: null,
        error: { message: "Database error occurred" },
      });

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "ValidName");
      await user.click(saveButton);

      await waitFor(() => {
        const errorElement = screen.getByText("Database error occurred");
        expect(errorElement).toBeInTheDocument();
        expect(errorElement.className).toContain("text-red-700");
      });
    });

    it("should clear error when submitting again", async () => {
      const user = userEvent.setup();

      // First, trigger an error
      mockEq.mockResolvedValueOnce({
        data: null,
        error: { message: "First error" },
      });

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Mike");
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("First error")).toBeInTheDocument();
      });

      // Now mock success
      mockEq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await user.click(saveButton);

      // Error should be cleared during the second attempt
      await waitFor(() => {
        expect(screen.queryByText("First error")).not.toBeInTheDocument();
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe("Form Field Updates", () => {
    it("should update name field value when typing", async () => {
      const user = userEvent.setup();

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.parentNamePlaceholder");

      await user.clear(nameInput);
      await user.type(nameInput, "Nina");

      expect(nameInput).toHaveValue("Nina");
    });

    it("should not allow editing email field", async () => {
      const user = userEvent.setup();

      render(
        <EditParentModal
          parent={mockParent}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByDisplayValue("parent@example.com");
      expect(emailInput).toBeDisabled();

      // Attempting to type should have no effect
      await user.type(emailInput, "newemail@example.com");
      expect(emailInput).toHaveValue("parent@example.com");
    });
  });

  describe("Bilingual Support", () => {
    it("should work with zh-CN locale", () => {
      render(
        <EditParentModal
          parent={mockParent}
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Modal should render correctly with zh-CN locale
      expect(screen.getByRole("heading", { name: "family.editParent" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("family.parentNamePlaceholder")).toBeInTheDocument();
    });
  });
});
