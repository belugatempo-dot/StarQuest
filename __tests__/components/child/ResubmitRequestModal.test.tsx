import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResubmitRequestModal from "@/components/child/ResubmitRequestModal";

// Mock router
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// Mock Supabase
const mockFrom = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock supabase helpers
const mockEq = jest.fn();
const mockTypedUpdate = jest.fn().mockReturnValue({ eq: mockEq });
jest.mock("@/lib/supabase/helpers", () => ({
  typedUpdate: (...args: any[]) => mockTypedUpdate(...args),
}));

// Mock localization
jest.mock("@/lib/localization", () => ({
  getQuestName: (quest: any, locale: string) => {
    if (!quest) return "Unknown Quest";
    return locale === "zh-CN" ? quest.name_zh || quest.name_en : quest.name_en;
  },
}));

describe("ResubmitRequestModal", () => {
  const mockOnClose = jest.fn();

  const mockTransaction = {
    id: "tx-1",
    stars: 5,
    status: "rejected",
    parent_response: "Not enough detail",
    custom_description: null,
    quest_id: "quest-1",
    child_id: "child-1",
    family_id: "family-1",
    child_note: "I did it",
    source: "child_request",
    reviewed_at: "2025-01-15T12:00:00Z",
    created_at: "2025-01-15T10:00:00Z",
    quests: {
      name_en: "Clean Room",
      name_zh: "打扫房间",
      icon: "🧹",
    },
  };

  const baseProps = {
    transaction: mockTransaction as any,
    locale: "en",
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
  });

  describe("Rendering", () => {
    it("renders the modal title in English", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      expect(screen.getByText("Resubmit Request")).toBeInTheDocument();
    });

    it("renders the modal title in Chinese", () => {
      render(<ResubmitRequestModal {...baseProps} locale="zh-CN" />);
      expect(screen.getByText("重新提交请求")).toBeInTheDocument();
    });

    it("displays the quest name", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      expect(screen.getByText("Clean Room")).toBeInTheDocument();
    });

    it("displays the quest icon", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      expect(screen.getByText("🧹")).toBeInTheDocument();
    });

    it("shows default icon when quest has no icon", () => {
      const noIconQuest = {
        ...mockTransaction,
        quests: { ...mockTransaction.quests, icon: null },
      };
      render(
        <ResubmitRequestModal
          {...baseProps}
          transaction={noIconQuest as any}
        />
      );
      expect(screen.getByText("⭐")).toBeInTheDocument();
    });

    it("displays the rejection reason", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      expect(screen.getByText("Not enough detail")).toBeInTheDocument();
      expect(screen.getByText("Rejection reason:")).toBeInTheDocument();
    });

    it("does not show rejection reason when there is none", () => {
      const noResponse = { ...mockTransaction, parent_response: null };
      render(
        <ResubmitRequestModal
          {...baseProps}
          transaction={noResponse as any}
        />
      );
      expect(
        screen.queryByText("Rejection reason:")
      ).not.toBeInTheDocument();
    });

    it("shows stars input with current value", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    });

    it("shows note textarea with current note", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      expect(screen.getByDisplayValue("I did it")).toBeInTheDocument();
    });

    it("shows cancel and resubmit buttons in English", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Resubmit")).toBeInTheDocument();
    });

    it("shows cancel and resubmit buttons in Chinese", () => {
      render(<ResubmitRequestModal {...baseProps} locale="zh-CN" />);
      expect(screen.getByText("取消")).toBeInTheDocument();
      expect(screen.getByText("重新提交")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("disables submit when stars is less than 1", () => {
      render(<ResubmitRequestModal {...baseProps} />);

      const starsInput = screen.getByDisplayValue("5");
      fireEvent.change(starsInput, { target: { value: "0" } });

      const submitButton = screen.getByText("Resubmit");
      expect(submitButton).toBeDisabled();
    });

    it("disables submit when note is empty", () => {
      const noNote = { ...mockTransaction, child_note: "" };
      render(
        <ResubmitRequestModal {...baseProps} transaction={noNote as any} />
      );

      const submitButton = screen.getByText("Resubmit");
      expect(submitButton).toBeDisabled();
    });

    it("disables submit when note is only whitespace", () => {
      const whitespaceNote = { ...mockTransaction, child_note: "   " };
      render(
        <ResubmitRequestModal
          {...baseProps}
          transaction={whitespaceNote as any}
        />
      );

      const submitButton = screen.getByText("Resubmit");
      expect(submitButton).toBeDisabled();
    });

    it("enables submit when note and stars are valid", () => {
      render(<ResubmitRequestModal {...baseProps} />);

      const submitButton = screen.getByText("Resubmit");
      expect(submitButton).not.toBeDisabled();
    });

    it("disables submit when note is cleared", () => {
      render(<ResubmitRequestModal {...baseProps} />);

      // Clear the note
      const noteTextarea = screen.getByDisplayValue("I did it");
      fireEvent.change(noteTextarea, { target: { value: "" } });

      const submitButton = screen.getByText("Resubmit");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Form Submission", () => {
    it("submits resubmitted transaction with pending status", async () => {
      render(<ResubmitRequestModal {...baseProps} />);

      fireEvent.click(screen.getByText("Resubmit"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateCall = mockTypedUpdate.mock.calls[0];
        expect(updateCall[1]).toBe("star_transactions");
        expect(updateCall[2].status).toBe("pending");
        expect(updateCall[2].parent_response).toBeNull();
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("updates stars and note when changed", async () => {
      render(<ResubmitRequestModal {...baseProps} />);

      // Change stars
      const starsInput = screen.getByDisplayValue("5");
      fireEvent.change(starsInput, { target: { value: "8" } });

      // Change note
      const noteInput = screen.getByDisplayValue("I did it");
      fireEvent.change(noteInput, {
        target: { value: "I cleaned everything" },
      });

      fireEvent.click(screen.getByText("Resubmit"));

      await waitFor(() => {
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.stars).toBe(8);
        expect(updateData.child_note).toBe("I cleaned everything");
      });
    });

    it("shows error on submission failure", async () => {
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockImplementation(() => {
          throw new Error("Update failed");
        }),
      });

      render(<ResubmitRequestModal {...baseProps} />);
      fireEvent.click(screen.getByText("Resubmit"));

      await waitFor(() => {
        expect(
          screen.getByText("Failed to resubmit, please try again")
        ).toBeInTheDocument();
      });
    });

    it("shows loading state during submission", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue(promise),
      });

      render(<ResubmitRequestModal {...baseProps} />);
      fireEvent.click(screen.getByText("Resubmit"));

      expect(screen.getByText("Submitting...")).toBeInTheDocument();

      resolvePromise!({ error: null });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Close", () => {
    it("calls onClose when cancel is clicked", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when close button is clicked", () => {
      render(<ResubmitRequestModal {...baseProps} />);
      fireEvent.click(screen.getByText("✕"));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Custom Description", () => {
    it("shows custom description instead of quest name when present", () => {
      const customDescTx = {
        ...mockTransaction,
        custom_description: "Special task",
      };
      render(
        <ResubmitRequestModal
          {...baseProps}
          transaction={customDescTx as any}
        />
      );
      expect(screen.getByText("Special task")).toBeInTheDocument();
    });
  });

  describe("Empty Note Validation via Form Submit", () => {
    it("shows English validation error when form is submitted with empty note", async () => {
      // Lines 50-56: childNote.trim() is empty -> shows locale-specific error.
      // The submit button is disabled when note is empty, but we can bypass
      // by directly submitting the form element via fireEvent.submit.
      const emptyNoteTx = { ...mockTransaction, child_note: "" };
      render(
        <ResubmitRequestModal
          {...baseProps}
          locale="en"
          transaction={emptyNoteTx as any}
        />
      );

      // Submit the form directly (bypasses disabled button)
      const form = screen.getByText("Resubmit").closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("Please provide a note describing what you did")
        ).toBeInTheDocument();
      });

      // Should NOT proceed to update
      expect(mockTypedUpdate).not.toHaveBeenCalled();
    });

    it("shows Chinese validation error when form is submitted with empty note in zh-CN locale", async () => {
      const emptyNoteTx = { ...mockTransaction, child_note: "" };
      render(
        <ResubmitRequestModal
          {...baseProps}
          locale="zh-CN"
          transaction={emptyNoteTx as any}
        />
      );

      // Submit the form directly
      const form = screen.getByText("重新提交").closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("请填写说明")).toBeInTheDocument();
      });

      expect(mockTypedUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling - Chinese locale", () => {
    it("shows Chinese error on submission failure", async () => {
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockImplementation(() => {
          throw new Error("Update failed");
        }),
      });

      render(<ResubmitRequestModal {...baseProps} locale="zh-CN" />);
      fireEvent.click(screen.getByText("重新提交"));

      await waitFor(() => {
        expect(
          screen.getByText("重新提交失败，请重试")
        ).toBeInTheDocument();
      });
    });

    it("shows Chinese loading state during submission", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue(promise),
      });

      render(<ResubmitRequestModal {...baseProps} locale="zh-CN" />);
      fireEvent.click(screen.getByText("重新提交"));

      expect(screen.getByText("提交中...")).toBeInTheDocument();

      resolvePromise!({ error: null });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("shows rejection reason in Chinese", () => {
      render(<ResubmitRequestModal {...baseProps} locale="zh-CN" />);
      expect(screen.getByText("被拒绝原因：")).toBeInTheDocument();
    });
  });

  describe("Update Error from Supabase", () => {
    it("shows error when update returns an error object", async () => {
      mockEq.mockResolvedValueOnce({
        error: new Error("Supabase update error"),
      });

      render(<ResubmitRequestModal {...baseProps} />);
      fireEvent.click(screen.getByText("Resubmit"));

      await waitFor(() => {
        expect(
          screen.getByText("Failed to resubmit, please try again")
        ).toBeInTheDocument();
      });
    });
  });
});
