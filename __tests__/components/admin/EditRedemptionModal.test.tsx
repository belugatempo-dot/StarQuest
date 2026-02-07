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

    it("displays stars spent", () => {
      render(<EditRedemptionModal {...baseProps} />);
      expect(screen.getByText(/-10/)).toBeInTheDocument();
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
      // Should have date input
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

  describe("Form Submission", () => {
    it("submits updated date/time", async () => {
      render(<EditRedemptionModal {...baseProps} />);

      const dateInput = screen.getByDisplayValue("2025-01-15");
      fireEvent.change(dateInput, { target: { value: "2025-01-20" } });

      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        const updateCall = mockTypedUpdate.mock.calls[0];
        expect(updateCall[1]).toBe("redemptions");
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

      // Find the time input element (type="time")
      const timeInputs = document.querySelectorAll('input[type="time"]');
      expect(timeInputs).toHaveLength(1);
      const timeInput = timeInputs[0] as HTMLInputElement;

      // Change the time value
      fireEvent.change(timeInput, { target: { value: "09:15" } });

      // Verify the time input updated
      expect(timeInput.value).toBe("09:15");
    });

    it("submits with updated time value", async () => {
      render(<EditRedemptionModal {...baseProps} />);

      // Find and change the time input
      const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
      fireEvent.change(timeInput, { target: { value: "18:45" } });

      // Submit
      fireEvent.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
      });

      // typedUpdate is called as typedUpdate(supabase, "redemptions", { created_at: ... })
      // The created_at is an ISO string built from "2025-01-15T18:45:00" local time
      // We verify the date was changed and the update was called with a valid ISO date
      const callArgs = mockTypedUpdate.mock.calls[0];
      expect(callArgs[1]).toBe("redemptions");
      const createdAt = callArgs[2].created_at;
      // Verify it's a valid ISO date string (timezone conversion makes the exact value vary)
      expect(new Date(createdAt).toISOString()).toBe(createdAt);
      // The created_at should differ from the original since we changed the time
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

      // In zh-CN locale, name_zh should be preferred over name_en
      expect(screen.getByText(/电影票/)).toBeInTheDocument();
      expect(screen.queryByText(/Movie Ticket/)).not.toBeInTheDocument();
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
