import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RewardFormModal from "@/components/admin/RewardFormModal";
import type { Database } from "@/types/database";

type Reward = Database["public"]["Tables"]["rewards"]["Row"];

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockUpdate = jest.fn();
const mockInsert = jest.fn();
const mockEq = jest.fn(() => ({ data: null, error: null }));
const mockFrom = jest.fn((table: string) => {
  if (table === "rewards") {
    return {
      update: mockUpdate.mockReturnValue({ eq: mockEq }),
      insert: mockInsert.mockReturnValue({ data: null, error: null }),
    };
  }
  return {};
});

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe("RewardFormModal", () => {
  const mockReward: Reward = {
    id: "reward-123",
    family_id: "family-123",
    name_en: "30 mins screen time",
    name_zh: "30分钟屏幕时间",
    stars_cost: 50,
    category: "screen_time",
    description: "30 minutes of tablet or phone time",
    icon: "📱",
    is_active: true,
    created_at: "2025-01-01",
  };

  const defaultProps = {
    familyId: "family-123",
    locale: "en",
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ data: null, error: null });
  });

  describe("Create Mode", () => {
    it("should render add reward modal title", () => {
      render(<RewardFormModal {...defaultProps} />);

      expect(screen.getByText("Add Reward")).toBeInTheDocument();
    });

    it("should render Chinese add reward title when locale is zh-CN", () => {
      render(<RewardFormModal {...defaultProps} locale="zh-CN" />);

      expect(screen.getByText("添加奖励")).toBeInTheDocument();
    });

    it("should have empty form fields", () => {
      render(<RewardFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., 30 mins screen time");
      const nameZhInput = screen.getByPlaceholderText("例如：30分钟屏幕时间");
      const starsInput = screen.getByRole("spinbutton");

      expect(nameEnInput).toHaveValue("");
      expect(nameZhInput).toHaveValue("");
      expect(starsInput).toHaveValue(0);
    });

    it("should show Create Reward button", () => {
      render(<RewardFormModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Create Reward" })).toBeInTheDocument();
    });

    it("should have active checkbox checked by default", () => {
      render(<RewardFormModal {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });
  });

  describe("Edit Mode", () => {
    it("should render edit reward modal title", () => {
      render(<RewardFormModal {...defaultProps} reward={mockReward} />);

      expect(screen.getByText("Edit Reward")).toBeInTheDocument();
    });

    it("should render Chinese edit reward title when locale is zh-CN", () => {
      render(<RewardFormModal {...defaultProps} reward={mockReward} locale="zh-CN" />);

      expect(screen.getByText("编辑奖励")).toBeInTheDocument();
    });

    it("should pre-fill all form fields with reward data", () => {
      render(<RewardFormModal {...defaultProps} reward={mockReward} />);

      const nameEnInput = screen.getByDisplayValue("30 mins screen time");
      const nameZhInput = screen.getByDisplayValue("30分钟屏幕时间");
      const starsInput = screen.getByDisplayValue("50");
      const descInput = screen.getByDisplayValue("30 minutes of tablet or phone time");
      const iconInput = screen.getByDisplayValue("📱");
      const checkbox = screen.getByRole("checkbox");

      expect(nameEnInput).toBeInTheDocument();
      expect(nameZhInput).toBeInTheDocument();
      expect(starsInput).toBeInTheDocument();
      expect(descInput).toBeInTheDocument();
      expect(iconInput).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it("should show Save Changes button", () => {
      render(<RewardFormModal {...defaultProps} reward={mockReward} />);

      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("should handle reward with null Chinese name", () => {
      const rewardWithoutZh = { ...mockReward, name_zh: null };
      render(<RewardFormModal {...defaultProps} reward={rewardWithoutZh} />);

      const nameZhInput = screen.getByPlaceholderText("例如：30分钟屏幕时间");
      expect(nameZhInput).toHaveValue("");
    });

    it("should handle reward with null description", () => {
      const rewardWithoutDesc = { ...mockReward, description: null };
      render(<RewardFormModal {...defaultProps} reward={rewardWithoutDesc} />);

      const descInput = screen.getByPlaceholderText(/Describe this reward/);
      expect(descInput).toHaveValue("");
    });

    it("should handle inactive reward", () => {
      const inactiveReward = { ...mockReward, is_active: false };
      render(<RewardFormModal {...defaultProps} reward={inactiveReward} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });
  });

  describe("Rendering Elements", () => {
    it("should display close button", () => {
      render(<RewardFormModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "✕" })).toBeInTheDocument();
    });

    it("should display all category buttons", () => {
      render(<RewardFormModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Screen/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Toys/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Activities/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Treats/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Other/ })).toBeInTheDocument();
    });

    it("should display category icons", () => {
      const { container } = render(<RewardFormModal {...defaultProps} />);

      expect(container.textContent).toContain("📱");
      expect(container.textContent).toContain("🧸");
      expect(container.textContent).toContain("🎨");
      expect(container.textContent).toContain("🍦");
      expect(container.textContent).toContain("🎁");
    });

    it("should highlight selected category", () => {
      render(<RewardFormModal {...defaultProps} reward={mockReward} />);

      const screenButton = screen.getByRole("button", { name: /Screen/ });
      expect(screenButton.className).toContain("border-primary");
    });

    it("should display cancel and save buttons", () => {
      render(<RewardFormModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Reward" })).toBeInTheDocument();
    });
  });

  describe("Form Interaction", () => {
    it("should allow editing English name", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., 30 mins screen time");
      await user.type(nameEnInput, "Movie night");

      expect(nameEnInput).toHaveValue("Movie night");
    });

    it("should allow editing Chinese name", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const nameZhInput = screen.getByPlaceholderText("例如：30分钟屏幕时间");
      await user.type(nameZhInput, "电影之夜");

      expect(nameZhInput).toHaveValue("电影之夜");
    });

    it("should allow editing stars cost", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "100");

      expect(starsInput).toHaveValue(100);
    });

    it("should allow editing description", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const descInput = screen.getByPlaceholderText(/Describe this reward/);
      await user.type(descInput, "Family movie night with popcorn");

      expect(descInput).toHaveValue("Family movie night with popcorn");
    });

    it("should allow editing icon", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const iconInput = screen.getByPlaceholderText("🎁");
      await user.clear(iconInput);
      await user.type(iconInput, "🎬");

      expect(iconInput).toHaveValue("🎬");
    });

    it("should allow selecting category", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const toysButton = screen.getByRole("button", { name: /Toys/ });
      await user.click(toysButton);

      expect(toysButton.className).toContain("border-primary");
    });

    it("should update icon when selecting category for new reward", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const toysButton = screen.getByRole("button", { name: /Toys/ });
      await user.click(toysButton);

      const iconInput = screen.getByPlaceholderText("🎁");
      expect(iconInput).toHaveValue("🧸");
    });

    it("should not update icon when selecting category for existing reward", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} reward={mockReward} />);

      const toysButton = screen.getByRole("button", { name: /Toys/ });
      await user.click(toysButton);

      const iconInput = screen.getByDisplayValue("📱");
      expect(iconInput).toHaveValue("📱"); // Should keep original icon
    });

    it("should allow toggling active status", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe("HTML5 Validation", () => {
    it("should have required attribute on English name input", () => {
      render(<RewardFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., 30 mins screen time");
      expect(nameEnInput).toBeRequired();
    });

    it("should have min and max attributes on stars cost input", () => {
      render(<RewardFormModal {...defaultProps} />);

      const starsInput = screen.getByRole("spinbutton");
      expect(starsInput).toHaveAttribute("min", "1");
      expect(starsInput).toHaveAttribute("max", "1000");
    });

    it("should have required attribute on stars cost input", () => {
      render(<RewardFormModal {...defaultProps} />);

      const starsInput = screen.getByRole("spinbutton");
      expect(starsInput).toBeRequired();
    });

    it("should have maxLength on icon input", () => {
      render(<RewardFormModal {...defaultProps} />);

      const iconInput = screen.getByPlaceholderText("🎁");
      expect(iconInput).toHaveAttribute("maxLength", "4");
    });
  });

  describe("Create Functionality", () => {
    it("should create new reward with all fields", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("e.g., 30 mins screen time"), "Movie night");
      await user.type(screen.getByPlaceholderText("例如：30分钟屏幕时间"), "电影之夜");

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "100");

      await user.click(screen.getByRole("button", { name: /Activities/ }));
      await user.type(screen.getByPlaceholderText(/Describe this reward/), "Family movie night");

      const submitButton = screen.getByRole("button", { name: "Create Reward" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          {
            family_id: "family-123",
            name_en: "Movie night",
            name_zh: "电影之夜",
            stars_cost: 100,
            category: "activities",
            description: "Family movie night",
            icon: "🎨",
            is_active: true,
          },
        ]);
      });

      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it("should convert empty Chinese name to null", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("e.g., 30 mins screen time"), "Reward");

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "10");

      const submitButton = screen.getByRole("button", { name: "Create Reward" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name_zh: null,
            }),
          ])
        );
      });
    });

    it("should convert empty description to null", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("e.g., 30 mins screen time"), "Reward");

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "10");

      const submitButton = screen.getByRole("button", { name: "Create Reward" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              description: null,
            }),
          ])
        );
      });
    });

    it("should trim whitespace from names and description", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("e.g., 30 mins screen time"), "  Reward  ");
      await user.type(screen.getByPlaceholderText("例如：30分钟屏幕时间"), "  奖励  ");
      await user.type(screen.getByPlaceholderText(/Describe this reward/), "  Description  ");

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "10");

      const submitButton = screen.getByRole("button", { name: "Create Reward" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name_en: "Reward",
              name_zh: "奖励",
              description: "Description",
            }),
          ])
        );
      });
    });
  });

  describe("Update Functionality", () => {
    it("should update existing reward with all fields", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} reward={mockReward} />);

      const nameEnInput = screen.getByDisplayValue("30 mins screen time");
      await user.clear(nameEnInput);
      await user.type(nameEnInput, "60 mins screen time");

      const starsInput = screen.getByDisplayValue("50");
      await user.clear(starsInput);
      await user.type(starsInput, "100");

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          family_id: "family-123",
          name_en: "60 mins screen time",
          name_zh: "30分钟屏幕时间",
          stars_cost: 100,
          category: "screen_time",
          description: "30 minutes of tablet or phone time",
          icon: "📱",
          is_active: true,
        });
      });

      expect(mockEq).toHaveBeenCalledWith("id", "reward-123");
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should display error when insert fails", async () => {
      const user = userEvent.setup();
      mockInsert.mockResolvedValueOnce({
        data: null,
        error: new Error("Database error"),
      });

      render(<RewardFormModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("e.g., 30 mins screen time"), "Reward");

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "10");

      const submitButton = screen.getByRole("button", { name: "Create Reward" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Save failed: Database error")).toBeInTheDocument();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("should display error when update fails", async () => {
      const user = userEvent.setup();
      mockEq.mockResolvedValueOnce({
        data: null,
        error: new Error("Update failed"),
      });

      render(<RewardFormModal {...defaultProps} reward={mockReward} />);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Save failed: Update failed")).toBeInTheDocument();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("should display Chinese error message when locale is zh-CN", async () => {
      const user = userEvent.setup();
      mockEq.mockResolvedValueOnce({
        data: null,
        error: new Error("Database error"),
      });

      render(<RewardFormModal {...defaultProps} reward={mockReward} locale="zh-CN" />);

      const submitButton = screen.getByRole("button", { name: "保存更改" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("保存失败: Database error")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should disable buttons during save", async () => {
      const user = userEvent.setup();

      let resolveInsert: (value: any) => void;
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve;
      });
      mockInsert.mockReturnValueOnce(insertPromise);

      render(<RewardFormModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("e.g., 30 mins screen time"), "Reward");

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "10");

      const submitButton = screen.getByRole("button", { name: "Create Reward" });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

      resolveInsert!({ data: null, error: null });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it("should show loading text during save", async () => {
      const user = userEvent.setup();

      let resolveInsert: (value: any) => void;
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve;
      });
      mockInsert.mockReturnValueOnce(insertPromise);

      render(<RewardFormModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("e.g., 30 mins screen time"), "Reward");

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "10");

      const submitButton = screen.getByRole("button", { name: "Create Reward" });
      await user.click(submitButton);

      expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();

      resolveInsert!({ data: null, error: null });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: "✕" });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onSuccess after successful save", async () => {
      const user = userEvent.setup();
      render(<RewardFormModal {...defaultProps} reward={mockReward} />);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });
});
