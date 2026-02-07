import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditTransactionModal from "@/components/admin/EditTransactionModal";

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

describe("EditTransactionModal", () => {
  const mockOnClose = jest.fn();

  const mockTransaction = {
    id: "tx-1",
    stars: 5,
    status: "approved",
    parent_response: "Good job!",
    custom_description: null,
    quest_id: "quest-1",
    child_id: "child-1",
    family_id: "family-1",
    child_note: null,
    source: "parent_record",
    reviewed_at: null,
    created_at: "2025-01-15T10:00:00Z",
    quests: {
      name_en: "Clean Room",
      name_zh: "打扫房间",
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
    it("renders the modal title", () => {
      render(<EditTransactionModal {...baseProps} />);
      expect(screen.getByText("editTransaction.title")).toBeInTheDocument();
    });

    it("displays the quest name", () => {
      render(<EditTransactionModal {...baseProps} />);
      expect(screen.getByText("Clean Room")).toBeInTheDocument();
    });

    it("displays stars value in input", () => {
      render(<EditTransactionModal {...baseProps} />);
      const starsInput = screen.getByDisplayValue("5");
      expect(starsInput).toBeInTheDocument();
    });

    it("displays parent response", () => {
      render(<EditTransactionModal {...baseProps} />);
      expect(screen.getByDisplayValue("Good job!")).toBeInTheDocument();
    });

    it("displays status selector with current status", () => {
      render(<EditTransactionModal {...baseProps} />);
      const select = screen.getByDisplayValue("status.approved");
      expect(select).toBeInTheDocument();
    });

    it("displays created date", () => {
      render(<EditTransactionModal {...baseProps} />);
      expect(
        screen.getByText("editTransaction.createdDate")
      ).toBeInTheDocument();
    });

    it("shows close button", () => {
      render(<EditTransactionModal {...baseProps} />);
      expect(screen.getByText("✕")).toBeInTheDocument();
    });

    it("shows cancel and save buttons", () => {
      render(<EditTransactionModal {...baseProps} />);
      expect(screen.getByText("common.cancel")).toBeInTheDocument();
      expect(screen.getByText("common.save")).toBeInTheDocument();
    });
  });

  describe("Custom Description", () => {
    it("shows custom description input when transaction has no quest_id", () => {
      const txNoQuest = {
        ...mockTransaction,
        quest_id: null,
        custom_description: "Manual entry",
      };
      render(
        <EditTransactionModal
          {...baseProps}
          transaction={txNoQuest as any}
        />
      );
      expect(
        screen.getByText("editTransaction.customDescription")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("Manual entry")).toBeInTheDocument();
    });

    it("hides custom description input when transaction has quest_id", () => {
      render(<EditTransactionModal {...baseProps} />);
      expect(
        screen.queryByText("editTransaction.customDescription")
      ).not.toBeInTheDocument();
    });
  });

  describe("Quick Approve Button", () => {
    it("shows quick approve for rejected transactions", () => {
      const rejectedTx = { ...mockTransaction, status: "rejected" };
      render(
        <EditTransactionModal
          {...baseProps}
          transaction={rejectedTx as any}
        />
      );
      expect(
        screen.getByText("editTransaction.saveAndApprove")
      ).toBeInTheDocument();
    });

    it("shows quick approve for pending transactions", () => {
      const pendingTx = { ...mockTransaction, status: "pending" };
      render(
        <EditTransactionModal
          {...baseProps}
          transaction={pendingTx as any}
        />
      );
      expect(
        screen.getByText("editTransaction.saveAndApprove")
      ).toBeInTheDocument();
    });

    it("does not show quick approve for approved transactions", () => {
      render(<EditTransactionModal {...baseProps} />);
      expect(
        screen.queryByText("editTransaction.saveAndApprove")
      ).not.toBeInTheDocument();
    });

    it("submits with approved status when quick approve is clicked", async () => {
      const rejectedTx = { ...mockTransaction, status: "rejected" };
      render(
        <EditTransactionModal
          {...baseProps}
          transaction={rejectedTx as any}
        />
      );

      fireEvent.click(screen.getByText("editTransaction.saveAndApprove"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateCall = mockTypedUpdate.mock.calls[0];
        expect(updateCall[1]).toBe("star_transactions");
        expect(updateCall[2].status).toBe("approved");
      });
    });
  });

  describe("Form Submission", () => {
    it("submits updated transaction data", async () => {
      render(<EditTransactionModal {...baseProps} />);

      // Change stars
      const starsInput = screen.getByDisplayValue("5");
      fireEvent.change(starsInput, { target: { value: "10" } });

      // Submit
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("shows error on update failure", async () => {
      mockEq.mockResolvedValueOnce({ error: { message: "Update failed" } });
      // typedUpdate needs to throw
      mockEq.mockReset();
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockImplementation(() => {
          throw new Error("Update failed");
        }),
      });

      render(<EditTransactionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Update failed")).toBeInTheDocument();
      });
    });

    it("calls onClose when cancel is clicked", () => {
      render(<EditTransactionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.cancel"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when close button is clicked", () => {
      render(<EditTransactionModal {...baseProps} />);
      fireEvent.click(screen.getByText("✕"));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Status Change", () => {
    it("shows status change hint when status is changed", () => {
      render(<EditTransactionModal {...baseProps} />);

      const select = screen.getByDisplayValue("status.approved");
      fireEvent.change(select, { target: { value: "pending" } });

      expect(
        screen.getByText(/editTransaction.statusChangeHint/)
      ).toBeInTheDocument();
    });
  });

  describe("Input change handlers", () => {
    it("updates custom description when input changes", () => {
      const txNoQuest = {
        ...mockTransaction,
        quest_id: null,
        custom_description: "Manual entry",
      };
      render(
        <EditTransactionModal
          {...baseProps}
          transaction={txNoQuest as any}
        />
      );

      const descInput = screen.getByDisplayValue("Manual entry");
      fireEvent.change(descInput, { target: { value: "New description" } });

      expect(screen.getByDisplayValue("New description")).toBeInTheDocument();
    });

    it("updates parent response when textarea changes", () => {
      render(<EditTransactionModal {...baseProps} />);

      const textarea = screen.getByDisplayValue("Good job!");
      fireEvent.change(textarea, { target: { value: "Great work!" } });

      expect(screen.getByDisplayValue("Great work!")).toBeInTheDocument();
    });
  });

  describe("Error fallback", () => {
    it("shows generic error when thrown error is not an Error instance", async () => {
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockImplementation(() => {
          throw "string error";
        }),
      });

      render(<EditTransactionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Failed to update")).toBeInTheDocument();
      });
    });
  });

  describe("Form submission branches", () => {
    it("submits with changed status when status differs from original", async () => {
      render(<EditTransactionModal {...baseProps} />);

      // Change status from approved to pending
      const select = screen.getByDisplayValue("status.approved");
      fireEvent.change(select, { target: { value: "pending" } });

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateCall = mockTypedUpdate.mock.calls[0];
        expect(updateCall[2].status).toBe("pending");
      });
    });

    it("does not include status in update when status unchanged", async () => {
      render(<EditTransactionModal {...baseProps} />);

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateCall = mockTypedUpdate.mock.calls[0];
        expect(updateCall[2]).not.toHaveProperty("status");
      });
    });

    it("sends null custom_description when transaction has quest_id", async () => {
      render(<EditTransactionModal {...baseProps} />);

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateCall = mockTypedUpdate.mock.calls[0];
        expect(updateCall[2].custom_description).toBeNull();
      });
    });

    it("sends custom_description when transaction has no quest_id", async () => {
      const txNoQuest = {
        ...mockTransaction,
        quest_id: null,
        custom_description: "Manual entry",
      };
      render(
        <EditTransactionModal
          {...baseProps}
          transaction={txNoQuest as any}
        />
      );

      // Change description
      const descInput = screen.getByDisplayValue("Manual entry");
      fireEvent.change(descInput, { target: { value: "Updated entry" } });

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateCall = mockTypedUpdate.mock.calls[0];
        expect(updateCall[2].custom_description).toBe("Updated entry");
      });
    });

    it("sends null parent_response when field is empty", async () => {
      const txNoResponse = {
        ...mockTransaction,
        parent_response: null,
      };
      render(
        <EditTransactionModal
          {...baseProps}
          transaction={txNoResponse as any}
        />
      );

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateCall = mockTypedUpdate.mock.calls[0];
        expect(updateCall[2].parent_response).toBeNull();
      });
    });
  });

  describe("Stars input edge case", () => {
    it("defaults stars to 0 when non-numeric value is entered", () => {
      render(<EditTransactionModal {...baseProps} />);
      const starsInput = screen.getByDisplayValue("5");
      fireEvent.change(starsInput, { target: { value: "" } });
      expect(starsInput).toHaveValue(0);
    });
  });

  describe("Update error from Supabase response", () => {
    it("throws and shows generic error when updateError is a plain object (not Error instance)", async () => {
      mockEq.mockResolvedValueOnce({ error: { message: "Constraint violation" } });

      render(<EditTransactionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        // updateError is thrown as a plain object, not an Error instance,
        // so the catch block falls into the generic "Failed to update" path
        expect(screen.getByText("Failed to update")).toBeInTheDocument();
      });
    });

    it("shows Error message when updateError is an Error instance", async () => {
      mockEq.mockResolvedValueOnce({ error: new Error("DB constraint error") });

      render(<EditTransactionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("DB constraint error")).toBeInTheDocument();
      });
    });
  });

  describe("Loading state", () => {
    it("shows loading text in save button while submitting", async () => {
      let resolveEq: (value: any) => void;
      const eqPromise = new Promise((resolve) => { resolveEq = resolve; });
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue(eqPromise),
      });

      render(<EditTransactionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      expect(screen.getByText("common.saving")).toBeInTheDocument();

      resolveEq!({ error: null });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("shows processing text in quick approve button while loading", async () => {
      const rejectedTx = { ...mockTransaction, status: "pending" };
      let resolveEq: (value: any) => void;
      const eqPromise = new Promise((resolve) => { resolveEq = resolve; });
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue(eqPromise),
      });

      render(
        <EditTransactionModal
          {...baseProps}
          transaction={rejectedTx as any}
        />
      );
      fireEvent.click(screen.getByText("editTransaction.saveAndApprove"));

      expect(screen.getByText("admin.processing")).toBeInTheDocument();

      resolveEq!({ error: null });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Date locale", () => {
    it("renders date in zh-CN locale", () => {
      render(<EditTransactionModal {...baseProps} locale="zh-CN" />);
      expect(
        screen.getByText("editTransaction.createdDate")
      ).toBeInTheDocument();
    });
  });

  describe("Quest display name", () => {
    it("shows custom_description as quest name when it exists", () => {
      const txCustomDesc = {
        ...mockTransaction,
        quest_id: null,
        custom_description: "Custom Quest",
        quests: null,
      };
      render(
        <EditTransactionModal
          {...baseProps}
          transaction={txCustomDesc as any}
        />
      );
      expect(screen.getByText("Custom Quest")).toBeInTheDocument();
    });
  });
});
