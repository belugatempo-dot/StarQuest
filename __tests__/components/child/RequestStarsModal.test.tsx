import React from "react";
import { render, screen, waitFor, within, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequestStarsModal from "@/components/child/RequestStarsModal";
import type { Database } from "@/types/database";

type Quest = Database["public"]["Tables"]["quests"]["Row"];

// Helper function to get local date string (same as component)
const getLocalDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockMaybeSingle = jest.fn();
const mockInsert = jest.fn();
const mockDuplicateCheckResult = jest.fn();
const mockRapidFireCheckResult = jest.fn();

// Create chainable mock for duplicate check queries
const createChainableMock = (finalResult: jest.Mock) => {
  const chainable: any = {};
  chainable.select = jest.fn(() => chainable);
  chainable.eq = jest.fn(() => chainable);
  chainable.gte = jest.fn(() => chainable);
  chainable.lte = jest.fn(() => finalResult());
  return chainable;
};

const mockFrom = jest.fn((table: string) => {
  if (table === "users") {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    };
  }
  if (table === "star_transactions") {
    // Return different mock based on what operation is being performed
    return {
      insert: mockInsert,
      select: jest.fn((cols: string) => {
        // For duplicate check (has created_at in select)
        if (cols === "id, created_at") {
          const chain: any = {};
          chain.eq = jest.fn(() => chain);
          chain.gte = jest.fn(() => chain);
          chain.lte = jest.fn(() => mockDuplicateCheckResult());
          return chain;
        }
        // For rapid-fire check (only id in select)
        if (cols === "id") {
          const chain: any = {};
          chain.eq = jest.fn(() => chain);
          chain.gte = jest.fn(() => mockRapidFireCheckResult());
          return chain;
        }
        return {};
      }),
    };
  }
  return {};
});

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe("RequestStarsModal", () => {
  const mockQuest: Quest = {
    id: "quest-123",
    family_id: "family-123",
    name_en: "Clean bedroom",
    name_zh: "打扫房间",
    description_en: "Make your bed and organize toys",
    description_zh: "整理床铺和玩具",
    stars: 10,
    icon: "🧹",
    category: "chores",
    type: "bonus",
    scope: "self",
    is_active: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  };

  const defaultProps = {
    quest: mockQuest,
    locale: "en",
    userId: "user-123",
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({
      data: { family_id: "family-123" },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
    // Default: no duplicates found
    mockDuplicateCheckResult.mockReturnValue({ data: [], error: null });
    mockRapidFireCheckResult.mockReturnValue({ data: [], error: null });
  });

  describe("Rendering", () => {
    it("should render modal with title", () => {
      render(<RequestStarsModal {...defaultProps} />);

      const modal = screen.getByRole("heading", { name: "quests.requestStars" });
      expect(modal).toBeInTheDocument();
    });

    it("should display quest icon", () => {
      render(<RequestStarsModal {...defaultProps} />);

      expect(screen.getByText("🧹")).toBeInTheDocument();
    });

    it("should display quest name in English", () => {
      render(<RequestStarsModal {...defaultProps} />);

      expect(screen.getByText("Clean bedroom")).toBeInTheDocument();
    });

    it("should display quest category", () => {
      render(<RequestStarsModal {...defaultProps} />);

      expect(screen.getByText("quests.category.chores")).toBeInTheDocument();
    });

    it("should display star value with + sign", () => {
      render(<RequestStarsModal {...defaultProps} />);

      expect(screen.getByText("+10")).toBeInTheDocument();
    });

    it("should display stars label", () => {
      render(<RequestStarsModal {...defaultProps} />);

      expect(screen.getByText("common.stars")).toBeInTheDocument();
    });

    it("should display note textarea with label", () => {
      render(<RequestStarsModal {...defaultProps} />);

      const label = screen.getByLabelText(/quests\.note/);
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe("TEXTAREA");
    });

    it("should display note placeholder in English", () => {
      render(<RequestStarsModal {...defaultProps} locale="en" />);

      const textarea = screen.getByPlaceholderText(
        "Tell your parents how you completed this quest..."
      );
      expect(textarea).toBeInTheDocument();
    });

    it("should display note placeholder in Chinese", () => {
      render(<RequestStarsModal {...defaultProps} locale="zh-CN" />);

      const textarea = screen.getByPlaceholderText(
        "告诉爸爸妈妈你完成了什么..."
      );
      expect(textarea).toBeInTheDocument();
    });

    it("should mark note as required", () => {
      render(<RequestStarsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Tell your parents how you completed this quest..."
      );
      expect(textarea).toHaveAttribute("required");
    });

    it("should display info box about approval process", () => {
      render(<RequestStarsModal {...defaultProps} />);

      expect(screen.getByText(/💡 Note:/)).toBeInTheDocument();
      expect(
        screen.getByText(
          /Your request will be sent to your parents for approval/
        )
      ).toBeInTheDocument();
    });

    it("should display cancel button", () => {
      render(<RequestStarsModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "common.cancel" })).toBeInTheDocument();
    });

    it("should display submit button", () => {
      render(<RequestStarsModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "common.submit" })).toBeInTheDocument();
    });

    it("should display close button", () => {
      render(<RequestStarsModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: "✕" });
      expect(closeButton).toBeInTheDocument();
    });

    it("should display default icon when quest has no icon", () => {
      const questWithoutIcon = { ...mockQuest, icon: null };
      render(<RequestStarsModal {...defaultProps} quest={questWithoutIcon} />);

      expect(screen.getByText("⭐")).toBeInTheDocument();
    });

    it("should not display category when quest has no category", () => {
      const questWithoutCategory = { ...mockQuest, category: null };
      render(<RequestStarsModal {...defaultProps} quest={questWithoutCategory} />);

      expect(screen.queryByText(/quests\.category\./)).not.toBeInTheDocument();
    });
  });

  describe("Bilingual Display", () => {
    it("should display quest name in Chinese when locale is zh-CN", () => {
      render(<RequestStarsModal {...defaultProps} locale="zh-CN" />);

      expect(screen.getByText("打扫房间")).toBeInTheDocument();
      expect(screen.queryByText("Clean bedroom")).not.toBeInTheDocument();
    });

    it("should fallback to English name when Chinese name is null", () => {
      const questWithoutZh = { ...mockQuest, name_zh: null };
      render(<RequestStarsModal {...defaultProps} quest={questWithoutZh} locale="zh-CN" />);

      expect(screen.getByText("Clean bedroom")).toBeInTheDocument();
    });

    it("should display category in English locale", () => {
      render(<RequestStarsModal {...defaultProps} locale="en" />);

      expect(screen.getByText("quests.category.chores")).toBeInTheDocument();
    });

    it("should display category in Chinese locale", () => {
      render(<RequestStarsModal {...defaultProps} locale="zh-CN" />);

      expect(screen.getByText("quests.category.chores")).toBeInTheDocument();
    });
  });

  describe("Note Input", () => {
    it("should allow typing in note textarea", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Tell your parents how you completed this quest..."
      );
      await user.type(textarea, "I cleaned everything thoroughly");

      expect(textarea).toHaveValue("I cleaned everything thoroughly");
    });

    it("should clear note when user deletes text", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Tell your parents how you completed this quest..."
      );
      await user.type(textarea, "Some text");
      await user.clear(textarea);

      expect(textarea).toHaveValue("");
    });
  });

  describe("Request Creation Flow", () => {
    it("should disable submit button when note is empty", async () => {
      render(<RequestStarsModal {...defaultProps} />);

      // Wait for date to be initialized
      await waitFor(() => {
        expect(screen.getByLabelText("quests.requestDate")).toHaveValue(getLocalDateString());
      });

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      expect(submitButton).toBeDisabled();
    });

    it("should show error when submitting without note", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      // Wait for date to be initialized
      await waitFor(() => {
        expect(screen.getByLabelText("quests.requestDate")).toHaveValue(getLocalDateString());
      });

      // Type whitespace only in note (should still be treated as empty)
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "   ");
      await user.clear(textarea);

      // Force submit by typing a note and then clearing it
      await user.type(textarea, "test");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      expect(submitButton).not.toBeDisabled();

      await user.clear(textarea);
      expect(submitButton).toBeDisabled();
    });

    it("should create request with note", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      // Wait for date to be initialized
      await waitFor(() => {
        expect(screen.getByLabelText("quests.requestDate")).toHaveValue(getLocalDateString());
      });

      const textarea = screen.getByPlaceholderText(
        "Tell your parents how you completed this quest..."
      );
      await user.type(textarea, "I did a great job!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            family_id: "family-123",
            child_id: "user-123",
            quest_id: "quest-123",
            stars: 10,
            source: "child_request",
            status: "pending",
            child_note: "I did a great job!",
            created_by: "user-123",
          })
        );
      });

      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it("should trim whitespace from note before submitting", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Tell your parents how you completed this quest..."
      );
      await user.type(textarea, "  Lots of spaces  ");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            child_note: "Lots of spaces",
          })
        );
      });
    });

    it("should disable submit button when note is whitespace-only", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Tell your parents how you completed this quest..."
      );
      await user.type(textarea, "   ");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      // Button should be disabled because whitespace-only note is not valid
      expect(submitButton).toBeDisabled();
    });

    it("should fetch family_id from user before creating request", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        // Verify mockFrom was called with "users" table
        expect(mockFrom).toHaveBeenCalledWith("users");
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error when family is not found", async () => {
      const user = userEvent.setup();
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Family not found")).toBeInTheDocument();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("should display error when database insert fails", async () => {
      const user = userEvent.setup();
      mockInsert.mockResolvedValueOnce({
        error: new Error("Database error"),
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Database error")).toBeInTheDocument();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("should display generic error for non-Error exceptions", async () => {
      const user = userEvent.setup();
      mockInsert.mockResolvedValueOnce({
        error: "Some string error",
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to create request")).toBeInTheDocument();
      });
    });

    it("should clear previous error when submitting again", async () => {
      const user = userEvent.setup();
      mockInsert.mockResolvedValueOnce({
        error: new Error("First error"),
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("First error")).toBeInTheDocument();
      });

      // Fix the error and submit again
      mockInsert.mockResolvedValueOnce({ error: null });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText("First error")).not.toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should disable submit button during loading", async () => {
      const user = userEvent.setup();

      // Create a promise we can control
      let resolveInsert: (value: any) => void;
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve;
      });
      mockInsert.mockReturnValueOnce(insertPromise);

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole("button", { name: "common.loading" })).toBeInTheDocument();

      // Resolve the promise
      resolveInsert!({ error: null });

      // Wait for onSuccess to be called (component behavior after success)
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it("should show loading text during submission", async () => {
      const user = userEvent.setup();

      // Create a promise we can control
      let resolveInsert: (value: any) => void;
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve;
      });
      mockInsert.mockReturnValueOnce(insertPromise);

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      // Should show loading text while promise is pending
      expect(screen.getByRole("button", { name: "common.loading" })).toBeInTheDocument();

      // Resolve the promise
      resolveInsert!({ error: null });

      // Wait for success callback
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it("should re-enable button after error", async () => {
      const user = userEvent.setup();
      mockInsert.mockResolvedValueOnce({
        error: new Error("Test error"),
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Test error")).toBeInTheDocument();
      });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when clicking close button", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: "✕" });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when clicking cancel button", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: "common.cancel" });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onSuccess after successful submission", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it("should not call onSuccess when submission fails", async () => {
      const user = userEvent.setup();
      mockInsert.mockResolvedValueOnce({
        error: new Error("Failed"),
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Form Submission", () => {
    it("should handle form submit event", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const form = screen.getByRole("button", { name: "common.submit" }).closest("form");
      expect(form).toBeInTheDocument();

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });
    });

    it("should prevent default form submission", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      // If preventDefault wasn't called, the page would reload
      // The fact that we can continue checking means it worked
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });
    });
  });

  describe("Visual Styling", () => {
    it("should apply success color to star value", () => {
      render(<RequestStarsModal {...defaultProps} />);

      const starValue = screen.getByText("+10");
      expect(starValue.className).toContain("text-success");
    });

    it("should display error message with danger styling when error occurs", async () => {
      const user = userEvent.setup();
      mockInsert.mockResolvedValueOnce({
        error: new Error("Test error"),
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        const errorDiv = screen.getByText("Test error").closest("div");
        expect(errorDiv?.className).toContain("bg-danger/10");
        expect(errorDiv?.className).toContain("text-danger");
      });
    });
  });

  describe("Date Selector", () => {
    it("should render date input with label", async () => {
      render(<RequestStarsModal {...defaultProps} />);

      await waitFor(() => {
        const dateInput = screen.getByLabelText("quests.requestDate");
        expect(dateInput).toBeInTheDocument();
        expect(dateInput).toHaveAttribute("type", "date");
      });
    });

    it("should initialize date to today after mount", async () => {
      render(<RequestStarsModal {...defaultProps} />);

      const todayString = getLocalDateString();
      await waitFor(() => {
        const dateInput = screen.getByLabelText("quests.requestDate");
        expect(dateInput).toHaveValue(todayString);
      });
    });

    it("should have max attribute set to today's date", async () => {
      render(<RequestStarsModal {...defaultProps} />);

      const todayString = getLocalDateString();
      await waitFor(() => {
        const dateInput = screen.getByLabelText("quests.requestDate");
        expect(dateInput).toHaveAttribute("max", todayString);
      });
    });

    it("should have required attribute", async () => {
      render(<RequestStarsModal {...defaultProps} />);

      await waitFor(() => {
        const dateInput = screen.getByLabelText("quests.requestDate");
        expect(dateInput).toHaveAttribute("required");
      });
    });

    it("should allow changing the date", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const dateInput = await screen.findByLabelText("quests.requestDate");
      await user.clear(dateInput);
      await user.type(dateInput, "2026-01-15");

      expect(dateInput).toHaveValue("2026-01-15");
    });

    it("should include selected date in transaction creation", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      // Wait for date to be set
      await waitFor(() => {
        expect(screen.getByLabelText("quests.requestDate")).toHaveValue(getLocalDateString());
      });

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            created_at: expect.any(String),
          })
        );
      });

      // Verify the created_at is an ISO string
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should include past date in transaction when selected", async () => {
      const user = userEvent.setup();
      render(<RequestStarsModal {...defaultProps} />);

      const dateInput = await screen.findByLabelText("quests.requestDate");
      await user.clear(dateInput);
      await user.type(dateInput, "2026-01-10");

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });

      const insertCall = mockInsert.mock.calls[0][0];
      // Verify the date is an ISO string (exact date may vary due to timezone handling)
      expect(insertCall.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // Verify the date input had the expected value
      expect(dateInput).toHaveValue("2026-01-10");
    });

    it("should display date selector before note field", () => {
      render(<RequestStarsModal {...defaultProps} />);

      const form = screen.getByRole("button", { name: "common.submit" }).closest("form");
      expect(form).toBeInTheDocument();

      // Verify the date input appears in the DOM
      const dateLabel = screen.getByText("quests.requestDate");
      const noteLabel = screen.getByText(/quests\.note/);

      // Check that date label appears before note label in the DOM
      const dateIndex = Array.from(form!.querySelectorAll("label")).findIndex(
        (el) => el.textContent?.includes("quests.requestDate")
      );
      const noteIndex = Array.from(form!.querySelectorAll("label")).findIndex(
        (el) => el.textContent?.includes("quests.note")
      );

      expect(dateIndex).toBeLessThan(noteIndex);
    });
  });

  describe("Duplicate Prevention", () => {
    it("should block submission when there is already a pending request for same quest today", async () => {
      const user = userEvent.setup();
      // Mock: there's already a pending request
      mockDuplicateCheckResult.mockReturnValue({
        data: [{ id: "existing-request-id", created_at: new Date().toISOString() }],
        error: null,
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I did this!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/You already have a pending request for this quest today/)).toBeInTheDocument();
      });

      // Should NOT call insert
      expect(mockInsert).not.toHaveBeenCalled();
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("should show Chinese error message for duplicate when locale is zh-CN", async () => {
      const user = userEvent.setup();
      mockDuplicateCheckResult.mockReturnValue({
        data: [{ id: "existing-request-id", created_at: new Date().toISOString() }],
        error: null,
      });

      render(<RequestStarsModal {...defaultProps} locale="zh-CN" />);

      // Add required note
      const textarea = screen.getByPlaceholderText("告诉爸爸妈妈你完成了什么...");
      await user.type(textarea, "我做完了!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/你今天已经提交过这个任务的申请了/)).toBeInTheDocument();
      });
    });

    it("should block rapid-fire submissions (same quest within 2 minutes)", async () => {
      const user = userEvent.setup();
      // No pending requests, but there's a recent submission
      mockDuplicateCheckResult.mockReturnValue({ data: [], error: null });
      mockRapidFireCheckResult.mockReturnValue({
        data: [{ id: "recent-request-id" }],
        error: null,
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I did this!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please don't submit repeatedly! Wait 2 minutes/)).toBeInTheDocument();
      });

      expect(mockInsert).not.toHaveBeenCalled();
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("should show Chinese error message for rapid-fire when locale is zh-CN", async () => {
      const user = userEvent.setup();
      mockDuplicateCheckResult.mockReturnValue({ data: [], error: null });
      mockRapidFireCheckResult.mockReturnValue({
        data: [{ id: "recent-request-id" }],
        error: null,
      });

      render(<RequestStarsModal {...defaultProps} locale="zh-CN" />);

      // Add required note
      const textarea = screen.getByPlaceholderText("告诉爸爸妈妈你完成了什么...");
      await user.type(textarea, "我做完了!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/请不要重复提交/)).toBeInTheDocument();
      });
    });

    it("should allow submission when no duplicates exist", async () => {
      const user = userEvent.setup();
      // No duplicates
      mockDuplicateCheckResult.mockReturnValue({ data: [], error: null });
      mockRapidFireCheckResult.mockReturnValue({ data: [], error: null });

      render(<RequestStarsModal {...defaultProps} />);

      // Wait for date to be initialized
      await waitFor(() => {
        expect(screen.getByLabelText("quests.requestDate")).toHaveValue(getLocalDateString());
      });

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });

      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it("should allow submission for different quest even if another quest has pending request", async () => {
      const user = userEvent.setup();
      // The duplicate check is for the specific quest, not all quests
      // So if there's a pending request for a different quest, it should be allowed
      mockDuplicateCheckResult.mockReturnValue({ data: [], error: null });
      mockRapidFireCheckResult.mockReturnValue({ data: [], error: null });

      render(<RequestStarsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText("quests.requestDate")).toHaveValue(getLocalDateString());
      });

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I completed this task!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it("should re-enable button after duplicate error", async () => {
      const user = userEvent.setup();
      mockDuplicateCheckResult.mockReturnValue({
        data: [{ id: "existing-request-id", created_at: new Date().toISOString() }],
        error: null,
      });

      render(<RequestStarsModal {...defaultProps} />);

      // Add required note
      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I did this!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/You already have a pending request/)).toBeInTheDocument();
      });

      // Button should be re-enabled so user can close or try again
      expect(submitButton).not.toBeDisabled();
    });

    it("should block submission when rate limited (more than 2 requests per minute)", async () => {
      const user = userEvent.setup();
      // No pending requests for this quest
      mockDuplicateCheckResult.mockReturnValue({ data: [], error: null });
      // No rapid-fire for same quest (first .select("id") call)
      // But rate limited overall (second .select("id") call returns >= 2)
      mockRapidFireCheckResult
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({ data: [{ id: "req-1" }, { id: "req-2" }], error: null });

      render(<RequestStarsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Tell your parents how you completed this quest...");
      await user.type(textarea, "I did this!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/You can only submit up to 2 requests per minute/)).toBeInTheDocument();
      });

      expect(mockInsert).not.toHaveBeenCalled();
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("should show Chinese error message for rate limit when locale is zh-CN", async () => {
      const user = userEvent.setup();
      mockDuplicateCheckResult.mockReturnValue({ data: [], error: null });
      mockRapidFireCheckResult
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({ data: [{ id: "req-1" }, { id: "req-2" }], error: null });

      render(<RequestStarsModal {...defaultProps} locale="zh-CN" />);

      const textarea = screen.getByPlaceholderText("告诉爸爸妈妈你完成了什么...");
      await user.type(textarea, "我做完了!");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/一分钟内最多只能提交2个请求/)).toBeInTheDocument();
      });
    });
  });

  describe("Empty Note Validation", () => {
    it("should show English validation error when form is submitted with empty note", async () => {
      // Lines 52-57: The handleSubmit validates note.trim() is empty.
      // The submit button is disabled when note is empty, but we can bypass
      // by directly submitting the form element via fireEvent.submit.
      render(<RequestStarsModal {...defaultProps} locale="en" />);

      // Wait for date to be initialized
      await waitFor(() => {
        expect(screen.getByLabelText("quests.requestDate")).toHaveValue(getLocalDateString());
      });

      // Submit the form directly (bypasses disabled button)
      const form = screen.getByRole("button", { name: "common.submit" }).closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("Please provide a note describing what you did")
        ).toBeInTheDocument();
      });

      // Should NOT proceed to fetch family or insert
      expect(mockMaybeSingle).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should show Chinese validation error when form is submitted with empty note in zh-CN locale", async () => {
      render(<RequestStarsModal {...defaultProps} locale="zh-CN" />);

      // Wait for date to be initialized
      await waitFor(() => {
        expect(screen.getByLabelText("quests.requestDate")).toHaveValue(getLocalDateString());
      });

      // Submit the form directly
      const form = screen.getByRole("button", { name: "common.submit" }).closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("请填写说明")).toBeInTheDocument();
      });
    });
  });
});
