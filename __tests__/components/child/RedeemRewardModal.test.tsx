import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RedeemRewardModal from "@/components/child/RedeemRewardModal";
import type { Database } from "@/types/database";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

describe("RedeemRewardModal", () => {
  const mockReward: Reward = {
    id: "reward-123",
    family_id: "family-123",
    name_en: "30 mins screen time",
    name_zh: "30分钟屏幕时间",
    description: "Extra 30 minutes of screen time",
    stars_cost: 50,
    icon: "📱",
    category: "screen_time",
    is_active: true,
    created_at: "2025-01-01",
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockMaybeSingle.mockResolvedValue({
      data: { family_id: "family-123" },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: { id: "redemption-123" },
      error: null,
    });

    mockEq.mockReturnThis();
    mockSelect.mockReturnValue({ single: mockSingle });
    mockRpc.mockResolvedValue({ data: true, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        };
      }
      if (table === "redemptions") {
        return {
          insert: mockInsert.mockReturnValue({
            select: () => ({
              single: mockSingle,
            }),
          }),
        };
      }
      return {};
    });
  });

  describe("Rendering", () => {
    it("should render modal with title", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("rewards.requestRedemption")).toBeInTheDocument();
    });

    it("should display reward information", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("30 mins screen time")).toBeInTheDocument();
      expect(screen.getByText("Extra 30 minutes of screen time")).toBeInTheDocument();
      expect(screen.getByText("📱")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("should display reward in Chinese when locale is zh-CN", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="zh-CN"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("30分钟屏幕时间")).toBeInTheDocument();
    });

    it("should display category", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("rewards.category.screen_time")).toBeInTheDocument();
    });

    it("should not display category if not provided", () => {
      const rewardWithoutCategory = { ...mockReward, category: null };
      render(
        <RedeemRewardModal
          reward={rewardWithoutCategory}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByText(/rewards\.category\./)).not.toBeInTheDocument();
    });

    it("should display balance information", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/credit\.currentBalance/)).toBeInTheDocument();
      expect(screen.getByText("100 ⭐")).toBeInTheDocument();
      expect(screen.getByText(/rewards\.cost/)).toBeInTheDocument();
      expect(screen.getByText("-50 ⭐")).toBeInTheDocument();
      expect(screen.getByText(/credit\.afterRedemption/)).toBeInTheDocument();
      expect(screen.getByText("50 ⭐")).toBeInTheDocument();
    });

    it("should show positive remaining balance in green", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const remainingBalance = screen.getByText("50 ⭐");
      expect(remainingBalance.className).toContain("text-success");
    });

    it("should show negative remaining balance in red", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={30}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const remainingBalance = screen.getByText("-20 ⭐");
      expect(remainingBalance.className).toContain("text-danger");
    });

    it("should render note textarea", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByPlaceholderText("When would you like this reward?");
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("should render info message", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/credit\.redemptionPendingInfo/)).toBeInTheDocument();
    });

    it("should render cancel and submit buttons", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("button", { name: "common.cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "common.submit" })).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("button", { name: "×" })).toBeInTheDocument();
    });
  });

  describe("Note Input", () => {
    it("should update note value when typing", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByPlaceholderText("When would you like this reward?");
      await user.type(textarea, "I would like this on Saturday");

      expect(textarea).toHaveValue("I would like this on Saturday");
    });
  });

  describe("Redemption Flow", () => {
    it("should create redemption request without note", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          family_id: "family-123",
          child_id: "user-123",
          reward_id: "reward-123",
          stars_spent: 50,
          status: "pending",
          child_note: null,
          uses_credit: false,
          credit_amount: 0,
          reviewed_at: null,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should create redemption request with note", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByPlaceholderText("When would you like this reward?");
      await user.type(textarea, "Saturday afternoon please");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          family_id: "family-123",
          child_id: "user-123",
          reward_id: "reward-123",
          stars_spent: 50,
          status: "pending",
          child_note: "Saturday afternoon please",
          uses_credit: false,
          credit_amount: 0,
          reviewed_at: null,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should trim whitespace from note", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByPlaceholderText("When would you like this reward?");
      await user.type(textarea, "  Tomorrow  ");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            child_note: "Tomorrow",
          })
        );
      });
    });

    it("should convert empty whitespace note to null", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByPlaceholderText("When would you like this reward?");
      await user.type(textarea, "   ");

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            child_note: null,
          })
        );
      });
    });

    it("should show error when family not found", async () => {
      const user = userEvent.setup();

      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Family not found")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should show error when insert fails", async () => {
      const user = userEvent.setup();

      // Override mockSingle to return an error
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: new Error("Database error"),
      });

      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Database error")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should show generic error when error has no message", async () => {
      const user = userEvent.setup();

      // Override mockSingle to return an error without message property
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "SOME_ERROR" }, // Object without message property
      });

      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to create redemption")).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading text during submission", async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: mockMaybeSingle,
              }),
            }),
          };
        }
        if (table === "redemptions") {
          return {
            insert: () => ({
              select: () => ({
                single: () => promise,
              }),
            }),
          };
        }
        return {};
      });

      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "common.loading" })).toBeInTheDocument();
      });

      resolvePromise!({ data: { id: "redemption-123" }, error: null });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should disable submit button during loading", async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: mockMaybeSingle,
              }),
            }),
          };
        }
        if (table === "redemptions") {
          return {
            insert: () => ({
              select: () => ({
                single: () => promise,
              }),
            }),
          };
        }
        return {};
      });

      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        const loadingButton = screen.getByRole("button", { name: "common.loading" });
        expect(loadingButton).toBeDisabled();
      });

      resolvePromise!({ data: { id: "redemption-123" }, error: null });
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const closeButton = screen.getByRole("button", { name: "×" });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByRole("button", { name: "common.cancel" });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
