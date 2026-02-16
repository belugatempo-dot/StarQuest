import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RedeemRewardModal, {
  computeCreditState,
  buildRedemptionPayload,
  getSubmitButtonConfig,
} from "@/components/child/RedeemRewardModal";
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

      expect(screen.getByRole("button", { name: "✕" })).toBeInTheDocument();
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

      const closeButton = screen.getByRole("button", { name: "✕" });
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

  describe("Parent Mode", () => {
    it("should show parent title when isParent is true", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          isParent={true}
          childId="child-123"
          familyId="family-123"
        />
      );

      expect(screen.getByText("admin.redeemForChild")).toBeInTheDocument();
      expect(screen.queryByText("rewards.requestRedemption")).not.toBeInTheDocument();
    });

    it("should show auto-approve info box instead of pending info for parent", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          isParent={true}
          childId="child-123"
          familyId="family-123"
        />
      );

      expect(screen.getByText(/admin\.autoApproveInfo/)).toBeInTheDocument();
      expect(screen.queryByText(/credit\.redemptionPendingInfo/)).not.toBeInTheDocument();
    });

    it("should show redeemNow button text for parent", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          isParent={true}
          childId="child-123"
          familyId="family-123"
        />
      );

      expect(screen.getByRole("button", { name: "admin.redeemNow" })).toBeInTheDocument();
    });

    it("should create approved redemption in parent mode with provided familyId", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          isParent={true}
          childId="child-456"
          familyId="family-789"
        />
      );

      const submitButton = screen.getByRole("button", { name: "admin.redeemNow" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            family_id: "family-789",
            child_id: "child-456",
            status: "approved",
            uses_credit: false,
            credit_amount: 0,
            reviewed_at: expect.any(String),
          })
        );
      });

      // Should NOT query users table since familyId is provided
      expect(mockMaybeSingle).not.toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should not show credit info for parent mode even when credit is enabled", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={20}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          isParent={true}
          childId="child-123"
          familyId="family-123"
          creditEnabled={true}
          availableCredit={100}
        />
      );

      // Credit sections should not render for parent
      expect(screen.queryByText(/credit\.availableCredit/)).not.toBeInTheDocument();
      expect(screen.queryByText(/credit\.canSpend/)).not.toBeInTheDocument();
    });

    it("should not show CreditUsageWarning for parent mode", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={20}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          isParent={true}
          childId="child-123"
          familyId="family-123"
          creditEnabled={true}
          availableCredit={100}
        />
      );

      expect(screen.queryByText(/credit\.borrowingWarningTitle/)).not.toBeInTheDocument();
    });

    it("should not record credit transaction in parent mode", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={20}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          isParent={true}
          childId="child-123"
          familyId="family-123"
          creditEnabled={true}
          availableCredit={100}
        />
      );

      const submitButton = screen.getByRole("button", { name: "admin.redeemNow" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Should NOT call rpc for credit
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("Credit System", () => {
    it("should show credit info when creditEnabled and availableCredit > 0", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={true}
          availableCredit={30}
        />
      );

      expect(screen.getByText(/credit\.availableCredit/)).toBeInTheDocument();
      expect(screen.getByText("+30 ⭐")).toBeInTheDocument();
      expect(screen.getByText(/credit\.canSpend/)).toBeInTheDocument();
    });

    it("should show canSpend section when creditEnabled even with 0 availableCredit", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={true}
          availableCredit={0}
        />
      );

      // canSpend is shown whenever creditEnabled, but availableCredit line only when > 0
      expect(screen.queryByText(/credit\.availableCredit/)).not.toBeInTheDocument();
      expect(screen.getByText(/credit\.canSpend/)).toBeInTheDocument();
    });

    it("should show confirmBorrow button text when credit will be used and not yet confirmed", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={20}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={true}
          availableCredit={50}
          creditLimit={100}
        />
      );

      // willUseCredit = true (cost 50 > currentStars 20), creditToUse = 30
      expect(screen.getByRole("button", { name: "credit.confirmBorrow" })).toBeInTheDocument();
    });

    it("should show credit confirmation step before actually submitting", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={20}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={true}
          availableCredit={50}
          creditLimit={100}
        />
      );

      // First click should trigger confirmation, not submission
      const submitButton = screen.getByRole("button", { name: "credit.confirmBorrow" });
      await user.click(submitButton);

      // After first click, button should change to common.submit (confirmCredit is now true)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "common.submit" })).toBeInTheDocument();
      });

      // Should NOT have called insert yet
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should submit with credit after confirming", async () => {
      const user = userEvent.setup();
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={20}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={true}
          availableCredit={50}
          creditLimit={100}
          creditUsed={5}
        />
      );

      // First click: confirm credit
      const confirmButton = screen.getByRole("button", { name: "credit.confirmBorrow" });
      await user.click(confirmButton);

      // Second click: actual submit
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "common.submit" })).toBeInTheDocument();
      });
      const submitButton = screen.getByRole("button", { name: "common.submit" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            uses_credit: true,
            credit_amount: 30, // cost 50 - currentStars 20 = 30
            status: "pending",
          })
        );
      });

      // Should also call rpc for credit transaction
      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith("record_credit_usage", {
          p_child_id: "user-123",
          p_redemption_id: "redemption-123",
          p_credit_amount: 30,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should show CreditUsageWarning when using credit in child mode", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={20}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={true}
          availableCredit={50}
          creditLimit={100}
          creditUsed={5}
        />
      );

      expect(screen.getByText(/credit\.borrowingWarningTitle/)).toBeInTheDocument();
    });

    it("should show cannot afford warning when insufficient spendable stars", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={10}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={false}
        />
      );

      // actualSpendable = 10 (no credit), cost = 50
      expect(screen.getByText(/credit\.cannotAfford/)).toBeInTheDocument();
      expect(screen.getByText(/credit\.needMoreStars/)).toBeInTheDocument();
    });

    it("should disable submit button when cannot afford", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={10}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={false}
        />
      );

      const submitButton = screen.getByRole("button", { name: "common.submit" });
      expect(submitButton).toBeDisabled();
    });

    it("should use spendableStars prop when provided", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={10}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={true}
          availableCredit={100}
          spendableStars={200}
        />
      );

      // With spendableStars=200 provided, canAfford should be true (200 >= 50)
      const submitButton = screen.getByRole("button", { name: "credit.confirmBorrow" });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Rendering Edge Cases", () => {
    it("should show default icon when reward has no icon", () => {
      const rewardNoIcon = { ...mockReward, icon: null };
      render(
        <RedeemRewardModal
          reward={rewardNoIcon}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("🎁")).toBeInTheDocument();
    });

    it("should not show description when reward has no description", () => {
      const rewardNoDesc = { ...mockReward, description: null };
      render(
        <RedeemRewardModal
          reward={rewardNoDesc}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByText("Extra 30 minutes of screen time")).not.toBeInTheDocument();
    });

    it("should show negative balance in danger style", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={-10}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const balanceText = screen.getByText("-10 ⭐");
      expect(balanceText.className).toContain("text-danger");
    });

    it("should show Chinese placeholder when locale is zh-CN", () => {
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

      expect(screen.getByPlaceholderText("你想什么时候获得这个奖励？")).toBeInTheDocument();
    });

    it("should apply warning button style when credit confirmation is pending", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={20}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          creditEnabled={true}
          availableCredit={50}
          creditLimit={100}
        />
      );

      const submitButton = screen.getByRole("button", { name: "credit.confirmBorrow" });
      expect(submitButton.className).toContain("bg-warning");
    });

    it("should apply success button style for parent mode", () => {
      render(
        <RedeemRewardModal
          reward={mockReward}
          currentStars={100}
          locale="en"
          userId="user-123"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          isParent={true}
          childId="child-123"
          familyId="family-123"
        />
      );

      const submitButton = screen.getByRole("button", { name: "admin.redeemNow" });
      expect(submitButton.className).toContain("bg-success");
    });
  });
});

describe("computeCreditState", () => {
  it("should compute basic state without credit", () => {
    const result = computeCreditState({
      currentStars: 100,
      rewardCost: 50,
      creditEnabled: false,
      availableCredit: 0,
      creditUsed: 0,
    });

    expect(result).toEqual({
      actualSpendable: 100,
      willUseCredit: false,
      creditToUse: 0,
      newTotalDebt: 0,
      canAfford: true,
      remainingStars: 50,
    });
  });

  it("should return canAfford false when insufficient stars without credit", () => {
    const result = computeCreditState({
      currentStars: 30,
      rewardCost: 50,
      creditEnabled: false,
      availableCredit: 0,
      creditUsed: 0,
    });

    expect(result.canAfford).toBe(false);
    expect(result.remainingStars).toBe(-20);
    expect(result.willUseCredit).toBe(false);
  });

  it("should include available credit in spendable when credit enabled", () => {
    const result = computeCreditState({
      currentStars: 20,
      rewardCost: 50,
      creditEnabled: true,
      availableCredit: 50,
      creditUsed: 0,
    });

    expect(result.actualSpendable).toBe(70);
    expect(result.willUseCredit).toBe(true);
    expect(result.creditToUse).toBe(30);
    expect(result.newTotalDebt).toBe(30);
    expect(result.canAfford).toBe(true);
  });

  it("should use spendableStars override when provided", () => {
    const result = computeCreditState({
      currentStars: 10,
      rewardCost: 50,
      creditEnabled: true,
      availableCredit: 100,
      creditUsed: 0,
      spendableStars: 200,
    });

    expect(result.actualSpendable).toBe(200);
    expect(result.canAfford).toBe(true);
  });

  it("should handle negative currentStars with credit", () => {
    const result = computeCreditState({
      currentStars: -10,
      rewardCost: 50,
      creditEnabled: true,
      availableCredit: 100,
      creditUsed: 5,
    });

    expect(result.actualSpendable).toBe(100);
    expect(result.willUseCredit).toBe(true);
    expect(result.creditToUse).toBe(50);
    expect(result.newTotalDebt).toBe(55);
    expect(result.remainingStars).toBe(-60);
  });

  it("should handle exact affordability boundary", () => {
    const result = computeCreditState({
      currentStars: 50,
      rewardCost: 50,
      creditEnabled: false,
      availableCredit: 0,
      creditUsed: 0,
    });

    expect(result.canAfford).toBe(true);
    expect(result.remainingStars).toBe(0);
    expect(result.willUseCredit).toBe(false);
  });

  it("should handle negative currentStars without credit", () => {
    const result = computeCreditState({
      currentStars: -5,
      rewardCost: 10,
      creditEnabled: false,
      availableCredit: 0,
      creditUsed: 0,
    });

    expect(result.actualSpendable).toBe(0);
    expect(result.canAfford).toBe(false);
    expect(result.remainingStars).toBe(-15);
  });

  it("should cap creditToUse at availableCredit", () => {
    const result = computeCreditState({
      currentStars: 0,
      rewardCost: 100,
      creditEnabled: true,
      availableCredit: 30,
      creditUsed: 0,
    });

    expect(result.creditToUse).toBe(30);
    expect(result.actualSpendable).toBe(30);
    expect(result.canAfford).toBe(false);
  });

  it("should not use credit when currentStars >= rewardCost even if credit enabled", () => {
    const result = computeCreditState({
      currentStars: 100,
      rewardCost: 50,
      creditEnabled: true,
      availableCredit: 200,
      creditUsed: 0,
    });

    expect(result.willUseCredit).toBe(false);
    expect(result.creditToUse).toBe(0);
    expect(result.newTotalDebt).toBe(0);
  });
});

describe("buildRedemptionPayload", () => {
  const testReward: Reward = {
    id: "reward-123",
    family_id: "family-123",
    name_en: "Screen Time",
    name_zh: "屏幕时间",
    description: null,
    stars_cost: 50,
    icon: null,
    category: null,
    is_active: true,
    created_at: "2025-01-01",
  };

  it("should build child pending payload without credit", () => {
    const payload = buildRedemptionPayload({
      familyId: "fam-1",
      childId: "child-1",
      reward: testReward,
      note: "please",
      isParent: false,
      willUseCredit: false,
      creditToUse: 0,
    });

    expect(payload).toEqual({
      family_id: "fam-1",
      child_id: "child-1",
      reward_id: "reward-123",
      stars_spent: 50,
      status: "pending",
      child_note: "please",
      uses_credit: false,
      credit_amount: 0,
      reviewed_at: null,
    });
  });

  it("should build child payload with credit", () => {
    const payload = buildRedemptionPayload({
      familyId: "fam-1",
      childId: "child-1",
      reward: testReward,
      note: "",
      isParent: false,
      willUseCredit: true,
      creditToUse: 30,
    });

    expect(payload).toEqual({
      family_id: "fam-1",
      child_id: "child-1",
      reward_id: "reward-123",
      stars_spent: 50,
      status: "pending",
      child_note: null,
      uses_credit: true,
      credit_amount: 30,
      reviewed_at: null,
    });
  });

  it("should build parent auto-approved payload with no credit", () => {
    const payload = buildRedemptionPayload({
      familyId: "fam-1",
      childId: "child-1",
      reward: testReward,
      note: "for good behavior",
      isParent: true,
      willUseCredit: true,
      creditToUse: 30,
    });

    expect(payload).toEqual({
      family_id: "fam-1",
      child_id: "child-1",
      reward_id: "reward-123",
      stars_spent: 50,
      status: "approved",
      child_note: "for good behavior",
      uses_credit: false,
      credit_amount: 0,
      reviewed_at: expect.any(String),
    });
  });

  it("should convert empty note to null", () => {
    const payload = buildRedemptionPayload({
      familyId: "fam-1",
      childId: "child-1",
      reward: testReward,
      note: "   ",
      isParent: false,
      willUseCredit: false,
      creditToUse: 0,
    });

    expect(payload.child_note).toBeNull();
  });
});

describe("getSubmitButtonConfig", () => {
  it("should return loading state", () => {
    const config = getSubmitButtonConfig({
      loading: true,
      isParent: false,
      willUseCredit: false,
      creditToUse: 0,
      confirmCredit: false,
    });

    expect(config.label).toBe("common.loading");
  });

  it("should return parent redeemNow with success style", () => {
    const config = getSubmitButtonConfig({
      loading: false,
      isParent: true,
      willUseCredit: false,
      creditToUse: 0,
      confirmCredit: false,
    });

    expect(config.label).toBe("admin.redeemNow");
    expect(config.className).toContain("bg-success");
  });

  it("should return confirmBorrow with warning style when credit pending confirmation", () => {
    const config = getSubmitButtonConfig({
      loading: false,
      isParent: false,
      willUseCredit: true,
      creditToUse: 30,
      confirmCredit: false,
    });

    expect(config.label).toBe("credit.confirmBorrow");
    expect(config.className).toContain("bg-warning");
  });

  it("should return default submit with primary style", () => {
    const config = getSubmitButtonConfig({
      loading: false,
      isParent: false,
      willUseCredit: false,
      creditToUse: 0,
      confirmCredit: false,
    });

    expect(config.label).toBe("common.submit");
    expect(config.className).toContain("bg-primary");
  });

  it("should return default submit after credit confirmed", () => {
    const config = getSubmitButtonConfig({
      loading: false,
      isParent: false,
      willUseCredit: true,
      creditToUse: 30,
      confirmCredit: true,
    });

    expect(config.label).toBe("common.submit");
    expect(config.className).toContain("bg-primary");
  });
});
