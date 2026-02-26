import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditRedemptionModal from "@/components/admin/EditRedemptionModal";

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

// Mock date utils
jest.mock("@/lib/date-utils", () => ({
  toLocalDateString: (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
  toLocalTimeString: (date: Date) => {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  },
}));

describe("EditRedemptionModal", () => {
  const mockOnClose = jest.fn();

  const mockRedemption = {
    id: "red-1",
    child_id: "child-1",
    reward_id: "reward-1",
    stars_spent: 10,
    status: "approved",
    created_at: "2025-01-15T14:30:00Z",
    reviewed_at: "2025-01-15T15:00:00Z",
    child_note: null,
    parent_response: null,
    family_id: "family-1",
    rewards: {
      name_en: "Ice Cream",
      name_zh: "冰淇淋",
      icon: "🍦",
    },
  };

  const baseProps = {
    redemption: mockRedemption,
    locale: "en",
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
  });

  describe("Rendering", () => {
    it("renders the modal title", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText("editRedemption.title")).toBeInTheDocument();
    });

    it("displays the reward name in English", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText(/Ice Cream/)).toBeInTheDocument();
    });

    it("displays the reward name in Chinese when locale is zh-CN", () => {
      render(<EditRedemptionModal {...baseProps} locale="zh-CN" />);
      expect(screen.getByText(/冰淇淋/)).toBeInTheDocument();
    });

    it("falls back to name_en when name_zh is null in zh-CN locale", () => {
      const redemptionNoZh = {
        ...mockRedemption,
        rewards: { ...mockRedemption.rewards, name_zh: null },
      };
      render(<EditRedemptionModal {...baseProps} locale="zh-CN" redemption={redemptionNoZh} />);
      expect(screen.getByText(/Ice Cream/)).toBeInTheDocument();
    });

    it("displays Unknown when reward has no name", () => {
      const noReward = { ...mockRedemption, rewards: null };
      render(<EditRedemptionModal {...baseProps} redemption={noReward} />);
      expect(screen.getByText(/Unknown/)).toBeInTheDocument();
    });

    it("displays reward icon", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText(/🍦/)).toBeInTheDocument();
    });

    it("shows default gift icon when reward has no icon", () => {
      const noIcon = {
        ...mockRedemption,
        rewards: { ...mockRedemption.rewards, icon: null },
      };
      render(<EditRedemptionModal {...baseProps} redemption={noIcon} />);
      expect(screen.getByText(/🎁/)).toBeInTheDocument();
    });

    it("shows date input", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText("common.date")).toBeInTheDocument();
      const dateInput = screen.getByDisplayValue("2025-01-15");
      expect(dateInput).toBeInTheDocument();
    });

    it("shows time input", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText("editRedemption.time")).toBeInTheDocument();
    });

    it("shows cancel and save buttons", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText("common.cancel")).toBeInTheDocument();
      expect(screen.getByText("common.save")).toBeInTheDocument();
    });
  });

  describe("Stars Spent Field", () => {
    it("shows editable stars spent input with current value", () => {
      render(<EditRedemptionModal {...baseProps} />);
      const input = screen.getByDisplayValue("10");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("min", "1");
      expect(input).toHaveAttribute("required");
    });

    it("shows stars spent hint text", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText("editRedemption.starsSpentHint")).toBeInTheDocument();
    });

    it("allows editing stars spent value", () => {
      render(<EditRedemptionModal {...baseProps} />);
      const input = screen.getByDisplayValue("10");
      fireEvent.change(input, { target: { value: "25" } });
      expect(input).toHaveValue(25);
    });

    it("submits with updated stars_spent value", async () => {
      render(<EditRedemptionModal {...baseProps} />);
      const input = screen.getByDisplayValue("10");
      fireEvent.change(input, { target: { value: "20" } });
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.stars_spent).toBe(20);
      });
    });
  });

  describe("Status Selector", () => {
    it("shows status dropdown with current value", () => {
      render(<EditRedemptionModal {...baseProps} />);
      const select = screen.getByDisplayValue("status.approved");
      expect(select).toBeInTheDocument();
    });

    it("has all four status options", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText("status.pending")).toBeInTheDocument();
      expect(screen.getByText("status.approved")).toBeInTheDocument();
      expect(screen.getByText("status.rejected")).toBeInTheDocument();
      expect(screen.getByText("status.fulfilled")).toBeInTheDocument();
    });

    it("allows changing status", () => {
      render(<EditRedemptionModal {...baseProps} />);
      const select = screen.getByDisplayValue("status.approved");
      fireEvent.change(select, { target: { value: "rejected" } });
      expect(select).toHaveValue("rejected");
    });

    it("shows status change hint when status differs from original", () => {
      render(<EditRedemptionModal {...baseProps} />);
      const select = screen.getByDisplayValue("status.approved");
      fireEvent.change(select, { target: { value: "rejected" } });
      expect(screen.getByText(/editRedemption.statusChangeHint/)).toBeInTheDocument();
    });

    it("does not show status change hint when status matches original", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.queryByText(/editRedemption.statusChangeHint/)).not.toBeInTheDocument();
    });

    it("submits with updated status", async () => {
      render(<EditRedemptionModal {...baseProps} />);
      const select = screen.getByDisplayValue("status.approved");
      fireEvent.change(select, { target: { value: "rejected" } });
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.status).toBe("rejected");
        expect(updateData.reviewed_at).toBeDefined();
      });
    });

    it("clears reviewed_at when changing to pending", async () => {
      render(<EditRedemptionModal {...baseProps} />);
      const select = screen.getByDisplayValue("status.approved");
      fireEvent.change(select, { target: { value: "pending" } });
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.status).toBe("pending");
        expect(updateData.reviewed_at).toBeNull();
      });
    });
  });

  describe("Parent Note", () => {
    it("shows parent note textarea", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText("editRedemption.parentNote")).toBeInTheDocument();
      const textarea = screen.getByPlaceholderText("editRedemption.parentNotePlaceholder");
      expect(textarea).toBeInTheDocument();
    });

    it("initializes parent note from redemption data", () => {
      const withNote = { ...mockRedemption, parent_response: "Great choice!" };
      render(<EditRedemptionModal {...baseProps} redemption={withNote} />);
      const textarea = screen.getByDisplayValue("Great choice!");
      expect(textarea).toBeInTheDocument();
    });

    it("allows editing parent note", () => {
      render(<EditRedemptionModal {...baseProps} />);
      const textarea = screen.getByPlaceholderText("editRedemption.parentNotePlaceholder");
      fireEvent.change(textarea, { target: { value: "Nice reward!" } });
      expect(textarea).toHaveValue("Nice reward!");
    });

    it("submits parent_response as null when empty", async () => {
      render(<EditRedemptionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.parent_response).toBeNull();
      });
    });

    it("submits parent_response when provided", async () => {
      render(<EditRedemptionModal {...baseProps} />);
      const textarea = screen.getByPlaceholderText("editRedemption.parentNotePlaceholder");
      fireEvent.change(textarea, { target: { value: "Good job" } });
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.parent_response).toBe("Good job");
      });
    });
  });

  describe("Balance Warning", () => {
    it("shows balance warning text", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText("editRedemption.balanceWarning")).toBeInTheDocument();
    });
  });

  describe("Quick Approve", () => {
    it("shows quick approve for pending redemptions", () => {
      const pending = { ...mockRedemption, status: "pending" };
      render(<EditRedemptionModal {...baseProps} redemption={pending} />);
      expect(screen.getByText("editRedemption.quickAction")).toBeInTheDocument();
      expect(screen.getByText("editRedemption.saveAndApprove")).toBeInTheDocument();
    });

    it("shows quick approve for rejected redemptions", () => {
      const rejected = { ...mockRedemption, status: "rejected" };
      render(<EditRedemptionModal {...baseProps} redemption={rejected} />);
      expect(screen.getByText("editRedemption.saveAndApprove")).toBeInTheDocument();
    });

    it("does not show quick approve for already approved redemptions", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.queryByText("editRedemption.saveAndApprove")).not.toBeInTheDocument();
    });

    it("does not show quick approve for fulfilled redemptions", () => {
      const fulfilled = { ...mockRedemption, status: "fulfilled" };
      render(<EditRedemptionModal {...baseProps} redemption={fulfilled} />);
      expect(screen.queryByText("editRedemption.saveAndApprove")).not.toBeInTheDocument();
    });

    it("submits with approved status on quick approve click", async () => {
      const pending = { ...mockRedemption, status: "pending" };
      render(<EditRedemptionModal {...baseProps} redemption={pending} />);
      fireEvent.click(screen.getByText("editRedemption.saveAndApprove"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.status).toBe("approved");
        expect(updateData.reviewed_at).toBeDefined();
      });
    });
  });

  describe("Form Submission", () => {
    it("submits all fields together", async () => {
      const pending = { ...mockRedemption, status: "pending" };
      render(<EditRedemptionModal {...baseProps} redemption={pending} />);

      // Change stars
      const starsInput = screen.getByDisplayValue("10");
      fireEvent.change(starsInput, { target: { value: "15" } });

      // Change status
      const statusSelect = screen.getByDisplayValue("status.pending");
      fireEvent.change(statusSelect, { target: { value: "approved" } });

      // Add parent note
      const textarea = screen.getByPlaceholderText("editRedemption.parentNotePlaceholder");
      fireEvent.change(textarea, { target: { value: "Well deserved" } });

      // Change date
      const dateInput = screen.getByDisplayValue("2025-01-15");
      fireEvent.change(dateInput, { target: { value: "2025-01-20" } });

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.stars_spent).toBe(15);
        expect(updateData.status).toBe("approved");
        expect(updateData.parent_response).toBe("Well deserved");
        expect(updateData.created_at).toBeDefined();
        expect(updateData.reviewed_at).toBeDefined();
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("shows error on update failure", async () => {
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockImplementation(() => {
          throw new Error("Failed to update");
        }),
      });

      render(<EditRedemptionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Failed to update")).toBeInTheDocument();
      });
    });

    it("shows error when update returns error object", async () => {
      mockEq.mockResolvedValueOnce({ error: new Error("Update conflict") });

      render(<EditRedemptionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Update conflict")).toBeInTheDocument();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("shows translated error when error is not an Error instance", async () => {
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockImplementation(() => {
          throw "some string error";
        }),
      });

      render(<EditRedemptionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(
          screen.getByText("editRedemption.updateFailed")
        ).toBeInTheDocument();
      });
    });

    it("disables save button while loading", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue(promise),
      });

      render(<EditRedemptionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.save"));

      // Should show saving state
      expect(screen.getByText("common.saving")).toBeInTheDocument();

      resolvePromise!({ error: null });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Time Input", () => {
    it("updates time value when time input changes", () => {
      render(<EditRedemptionModal {...baseProps} />);

      const timeInputs = document.querySelectorAll('input[type="time"]');
      expect(timeInputs).toHaveLength(1);
      const timeInput = timeInputs[0] as HTMLInputElement;

      fireEvent.change(timeInput, { target: { value: "09:15" } });
      expect(timeInput.value).toBe("09:15");
    });

    it("submits with updated time value", async () => {
      render(<EditRedemptionModal {...baseProps} />);

      const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
      fireEvent.change(timeInput, { target: { value: "18:45" } });

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
      });

      const callArgs = mockTypedUpdate.mock.calls[0];
      expect(callArgs[1]).toBe("redemptions");
      const createdAt = callArgs[2].created_at;
      expect(new Date(createdAt).toISOString()).toBe(createdAt);
      const originalIso = new Date(mockRedemption.created_at).toISOString();
      expect(createdAt).not.toBe(originalIso);
    });
  });

  describe("Branch coverage", () => {
    it("displays Chinese reward name when locale is zh-CN and name_zh is set", () => {
      const zhRedemption = {
        ...mockRedemption,
        rewards: {
          name_en: "Movie Ticket",
          name_zh: "电影票",
          icon: "🎬",
        },
      };
      render(
        <EditRedemptionModal
          {...baseProps}
          locale="zh-CN"
          redemption={zhRedemption}
        />
      );

      expect(screen.getByText(/电影票/)).toBeInTheDocument();
      expect(screen.queryByText(/Movie Ticket/)).not.toBeInTheDocument();
    });

    it("sets reviewed_at for fulfilled status", async () => {
      render(<EditRedemptionModal {...baseProps} />);
      const select = screen.getByDisplayValue("status.approved");
      fireEvent.change(select, { target: { value: "fulfilled" } });
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateData = mockTypedUpdate.mock.calls[0][2];
        expect(updateData.status).toBe("fulfilled");
        // fulfilled doesn't set reviewed_at (not approved/rejected/pending)
        expect(updateData).not.toHaveProperty("reviewed_at");
      });
    });
  });

  describe("Close", () => {
    it("calls onClose when cancel is clicked", () => {
      render(<EditRedemptionModal {...baseProps} />);
      fireEvent.click(screen.getByText("common.cancel"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when close button is clicked", () => {
      render(<EditRedemptionModal {...baseProps} />);
      fireEvent.click(screen.getByText("✕"));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
