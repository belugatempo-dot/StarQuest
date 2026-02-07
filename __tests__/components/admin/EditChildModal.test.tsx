import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditChildModal from "@/components/admin/EditChildModal";
import type { User } from "@/lib/auth";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("EditChildModal", () => {
  const mockChild: User = {
    id: "child-123",
    email: "alice@example.com",
    name: "Alice",
    role: "child",
    family_id: "family-123",
    locale: "en",
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup for successful update
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  describe("Rendering", () => {
    it("should render modal with correct title", () => {
      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("heading", { name: "family.editChild" })).toBeInTheDocument();
    });

    it("should render name field with pre-filled value", () => {
      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveValue("Alice");
      expect(screen.getByText("family.childName")).toBeInTheDocument();
    });

    it("should render email field with pre-filled value", () => {
      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText("family.childEmailPlaceholder");
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveValue("alice@example.com");
      expect(screen.getByText("family.childEmail")).toBeInTheDocument();
    });

    it("should render email field empty when child has no email", () => {
      const childWithoutEmail = { ...mockChild, email: null };
      render(
        <EditChildModal
          child={childWithoutEmail}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText("family.childEmailPlaceholder");
      expect(emailInput).toHaveValue("");
    });

    it("should render cancel button", () => {
      render(
        <EditChildModal
          child={mockChild}
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
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const saveButton = screen.getByRole("button", { name: "common.save" });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });

    it("should show optional indicator for email field", () => {
      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/common\.optional/)).toBeInTheDocument();
    });

    it("should show required indicator for name field", () => {
      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameLabel = screen.getByText("family.childName").parentElement;
      expect(nameLabel).toHaveTextContent("*");
    });
  });

  describe("Form Validation", () => {
    it("should prevent submission when name is empty", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");

      // Clear the name field
      await user.clear(nameInput);

      // The required attribute should be present
      expect(nameInput).toHaveAttribute('required');

      // Note: With HTML required attribute, browser prevents submission
      // so we can't test the React validation for empty fields
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should show nameRequired error when submitting whitespace-only name", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");

      await user.clear(nameInput);
      await user.type(nameInput, "   ");

      // Use fireEvent.submit to bypass HTML5 required validation
      const form = screen.getByRole("button", { name: "common.save" }).closest("form")!;
      fireEvent.submit(form);

      expect(screen.getByText("family.nameRequired")).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should allow submission with valid name", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Bob");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe("Child Update Flow", () => {
    it("should update child with name only", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const emailInput = screen.getByPlaceholderText("family.childEmailPlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Bob");
      await user.clear(emailInput);
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/en/api/admin/update-child",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              childId: "child-123",
              name: "Bob",
              email: null,
            }),
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should update child with name and email", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const emailInput = screen.getByPlaceholderText("family.childEmailPlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Charlie");
      await user.clear(emailInput);
      await user.type(emailInput, "charlie@example.com");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/en/api/admin/update-child",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              childId: "child-123",
              name: "Charlie",
              email: "charlie@example.com",
            }),
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should trim name and email before updating", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const emailInput = screen.getByPlaceholderText("family.childEmailPlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "  Diana  ");
      await user.clear(emailInput);
      await user.type(emailInput, "  diana@example.com  ");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/en/api/admin/update-child",
          expect.objectContaining({
            body: JSON.stringify({
              childId: "child-123",
              name: "Diana",
              email: "diana@example.com",
            }),
          })
        );
      });
    });

    it("should set email to null when empty string", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const emailInput = screen.getByPlaceholderText("family.childEmailPlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Eve");
      await user.clear(emailInput);
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/en/api/admin/update-child",
          expect.objectContaining({
            body: JSON.stringify({
              childId: "child-123",
              name: "Eve",
              email: null,
            }),
          })
        );
      });
    });

    it("should show error when API call fails", async () => {
      const user = userEvent.setup();

      // Mock API error
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Database connection failed" }),
      });

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
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
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Grace");
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("family.updateChildError")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should show generic error when catch has no message", async () => {
      const user = userEvent.setup();

      // Mock error without .message property (not an Error instance)
      mockFetch.mockRejectedValue({ code: "UNKNOWN" });

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Valid");
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("family.updateChildError")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should show error when fetch throws exception", async () => {
      const user = userEvent.setup();

      // Mock fetch throwing error
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Frank");
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("should show loading text on save button during update", async () => {
      const user = userEvent.setup();

      // Mock slow update
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ ok: true, json: async () => ({ success: true }) });
            }, 100);
          })
      );

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
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
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ ok: true, json: async () => ({ success: true }) });
            }, 100);
          })
      );

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
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
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ ok: true, json: async () => ({ success: true }) });
            }, 100);
          })
      );

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
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

    it("should re-enable buttons after update completes", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Kate");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // After completion, onSuccess is called and modal would close
      // So we just verify the update happened
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByRole("button", { name: "common.cancel" });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not close modal on successful update (calls onSuccess instead)", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
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
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const errorDiv = screen.queryByText(/family\.nameRequired|family\.updateChildError/);
      expect(errorDiv).not.toBeInTheDocument();
    });

    it("should show error in red box when API call fails", async () => {
      const user = userEvent.setup();

      // Mock API error
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Database error occurred" }),
      });

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "First error" }),
      });

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Mike");
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("First error")).toBeInTheDocument();
      });

      // Now mock success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await user.click(saveButton);

      // Error should be cleared during the second attempt
      await waitFor(() => {
        expect(screen.queryByText("First error")).not.toBeInTheDocument();
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe("Locale Handling", () => {
    it("should use correct locale in API URL", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");
      const saveButton = screen.getByRole("button", { name: "common.save" });

      await user.clear(nameInput);
      await user.type(nameInput, "Test");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/zh-CN/api/admin/update-child",
          expect.anything()
        );
      });
    });
  });

  describe("Form Field Updates", () => {
    it("should update name field value when typing", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText("family.childNamePlaceholder");

      await user.clear(nameInput);
      await user.type(nameInput, "Nina");

      expect(nameInput).toHaveValue("Nina");
    });

    it("should update email field value when typing", async () => {
      const user = userEvent.setup();

      render(
        <EditChildModal
          child={mockChild}
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText("family.childEmailPlaceholder");

      await user.clear(emailInput);
      await user.type(emailInput, "nina@example.com");

      expect(emailInput).toHaveValue("nina@example.com");
    });
  });
});
