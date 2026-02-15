import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LevelFormModal from "@/components/admin/LevelFormModal";
import type { Database } from "@/types/database";

type Level = Database["public"]["Tables"]["levels"]["Row"];

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockUpdate = jest.fn();
const mockEq = jest.fn(() => ({ data: null, error: null }));
const mockFrom = jest.fn((table: string) => {
  if (table === "levels") {
    return {
      update: mockUpdate.mockReturnValue({ eq: mockEq }),
    };
  }
  return {};
});

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe("LevelFormModal", () => {
  const mockLevel: Level = {
    id: "level-123",
    family_id: "family-123",
    level_number: 3,
    name_en: "Adventurer",
    name_zh: "冒险家",
    stars_required: 150,
    icon: "🎒",
    created_at: "2025-01-01",
  };

  const defaultProps = {
    level: mockLevel,
    locale: "en",
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ data: null, error: null });
  });

  describe("Rendering", () => {
    it("should render modal with title including level number", () => {
      render(<LevelFormModal {...defaultProps} />);

      expect(screen.getByText("Edit Level 3")).toBeInTheDocument();
    });

    it("should render modal title in Chinese when locale is zh-CN", () => {
      render(<LevelFormModal {...defaultProps} locale="zh-CN" />);

      expect(screen.getByText("编辑等级 3")).toBeInTheDocument();
    });

    it("should display close button", () => {
      render(<LevelFormModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "✕" })).toBeInTheDocument();
    });

    it("should display info notice about level system", () => {
      render(<LevelFormModal {...defaultProps} />);

      expect(screen.getByText(/💡/)).toBeInTheDocument();
      expect(screen.getByText(/Level numbers are fixed/)).toBeInTheDocument();
    });

    it("should display level number as read-only", () => {
      render(<LevelFormModal {...defaultProps} />);

      const levelNumberField = screen.getByText("3");
      expect(levelNumberField.closest("div")?.className).toContain("bg-white/10");
    });

    it("should pre-fill English name field", () => {
      render(<LevelFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., Star Master");
      expect(nameEnInput).toHaveValue("Adventurer");
    });

    it("should pre-fill Chinese name field", () => {
      render(<LevelFormModal {...defaultProps} />);

      const nameZhInput = screen.getByPlaceholderText("例如：星星大师");
      expect(nameZhInput).toHaveValue("冒险家");
    });

    it("should pre-fill stars required field", () => {
      render(<LevelFormModal {...defaultProps} />);

      const starsInput = screen.getByDisplayValue("150");
      expect(starsInput).toBeInTheDocument();
    });

    it("should pre-fill icon field", () => {
      render(<LevelFormModal {...defaultProps} />);

      const iconInput = screen.getByDisplayValue("🎒");
      expect(iconInput).toBeInTheDocument();
    });

    it("should display suggested icons", () => {
      render(<LevelFormModal {...defaultProps} />);

      expect(screen.getByText("🌱")).toBeInTheDocument();
      expect(screen.getByText("🔍")).toBeInTheDocument();
      expect(screen.getByText("⭐")).toBeInTheDocument();
      expect(screen.getByText("👑")).toBeInTheDocument();
    });

    it("should display cancel and save buttons", () => {
      render(<LevelFormModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("should handle level with null Chinese name", () => {
      const levelWithoutZh = { ...mockLevel, name_zh: null };
      render(<LevelFormModal {...defaultProps} level={levelWithoutZh} />);

      const nameZhInput = screen.getByPlaceholderText("例如：星星大师");
      expect(nameZhInput).toHaveValue("");
    });

    it("should handle level with null icon", () => {
      const levelWithoutIcon = { ...mockLevel, icon: null };
      render(<LevelFormModal {...defaultProps} level={levelWithoutIcon} />);

      const iconInput = screen.getByPlaceholderText("⭐");
      expect(iconInput).toHaveValue("⭐");
    });
  });

  describe("Form Interaction", () => {
    it("should allow editing English name", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., Star Master");
      await user.clear(nameEnInput);
      await user.type(nameEnInput, "Explorer");

      expect(nameEnInput).toHaveValue("Explorer");
    });

    it("should allow editing Chinese name", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const nameZhInput = screen.getByPlaceholderText("例如：星星大师");
      await user.clear(nameZhInput);
      await user.type(nameZhInput, "探险者");

      expect(nameZhInput).toHaveValue("探险者");
    });

    it("should allow editing stars required", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const starsInput = screen.getByDisplayValue("150");
      await user.clear(starsInput);
      await user.type(starsInput, "200");

      expect(starsInput).toHaveValue(200);
    });

    it("should allow editing icon", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const iconInput = screen.getByDisplayValue("🎒");
      await user.clear(iconInput);
      await user.type(iconInput, "🏆");

      expect(iconInput).toHaveValue("🏆");
    });

    it("should allow selecting icon from suggestions", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const trophyButton = screen.getByRole("button", { name: "🏆" });
      await user.click(trophyButton);

      const iconInput = screen.getByDisplayValue("🏆");
      expect(iconInput).toHaveValue("🏆");
    });

    it("should highlight selected suggested icon", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const currentIconButton = screen.getByRole("button", { name: "🎒" });
      expect(currentIconButton.className).toContain("border-primary");
    });
  });

  describe("Validation", () => {
    it("should have required attribute on English name input", () => {
      render(<LevelFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., Star Master");
      expect(nameEnInput).toBeRequired();
    });

    it("should have min attribute on stars required input", () => {
      render(<LevelFormModal {...defaultProps} />);

      const starsInput = screen.getByDisplayValue("150");
      expect(starsInput).toHaveAttribute("min", "0");
      expect(starsInput).toHaveAttribute("max", "100000");
    });

    it("should allow stars required to be zero", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const starsInput = screen.getByDisplayValue("150");
      await user.clear(starsInput);
      await user.type(starsInput, "0");

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });
  });

  describe("Form Validation", () => {
    it("should show error when English name is whitespace only", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., Star Master");
      await user.clear(nameEnInput);
      await user.type(nameEnInput, "   ");

      const form = screen.getByRole("button", { name: "Save Changes" }).closest("form")!;
      fireEvent.submit(form);

      expect(screen.getByText("English name is required")).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should show Chinese error when name is empty with zh-CN locale", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} locale="zh-CN" />);

      const nameEnInput = screen.getByPlaceholderText("e.g., Star Master");
      await user.clear(nameEnInput);
      await user.type(nameEnInput, "   ");

      const form = screen.getByRole("button", { name: "保存更改" }).closest("form")!;
      fireEvent.submit(form);

      expect(screen.getByText("请输入英文名称")).toBeInTheDocument();
    });

    it("should show error when stars required is negative", async () => {
      const user = userEvent.setup();
      const levelWithNegativeStars = { ...mockLevel, stars_required: -5 };
      render(<LevelFormModal {...defaultProps} level={levelWithNegativeStars} />);

      const form = screen.getByRole("button", { name: "Save Changes" }).closest("form")!;
      fireEvent.submit(form);

      expect(screen.getByText("Stars required cannot be negative")).toBeInTheDocument();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should show Chinese error when stars is negative with zh-CN locale", async () => {
      const user = userEvent.setup();
      const levelWithNegativeStars = { ...mockLevel, stars_required: -5 };
      render(<LevelFormModal {...defaultProps} level={levelWithNegativeStars} locale="zh-CN" />);

      const form = screen.getByRole("button", { name: "保存更改" }).closest("form")!;
      fireEvent.submit(form);

      expect(screen.getByText("星星要求不能为负数")).toBeInTheDocument();
    });
  });

  describe("Save Functionality", () => {
    it("should update level with all fields", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., Star Master");
      await user.clear(nameEnInput);
      await user.type(nameEnInput, "Hero");

      const nameZhInput = screen.getByPlaceholderText("例如：星星大师");
      await user.clear(nameZhInput);
      await user.type(nameZhInput, "英雄");

      const starsInput = screen.getByDisplayValue("150");
      await user.clear(starsInput);
      await user.type(starsInput, "300");

      const iconButton = screen.getByRole("button", { name: "🦸" });
      await user.click(iconButton);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          name_en: "Hero",
          name_zh: "英雄",
          stars_required: 300,
          icon: "🦸",
        });
      });

      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it("should convert empty Chinese name to null", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const nameZhInput = screen.getByPlaceholderText("例如：星星大师");
      await user.clear(nameZhInput);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            name_zh: null,
          })
        );
      });
    });

    it("should trim whitespace from names", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const nameEnInput = screen.getByPlaceholderText("e.g., Star Master");
      await user.clear(nameEnInput);
      await user.type(nameEnInput, "  Hero  ");

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            name_en: "Hero",
          })
        );
      });
    });

    it("should call eq with level id", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith("id", "level-123");
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error when update fails", async () => {
      const user = userEvent.setup();
      mockEq.mockResolvedValueOnce({
        data: null,
        error: new Error("Database error"),
      });

      render(<LevelFormModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Save failed: Database error")).toBeInTheDocument();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it("should display Chinese error message when locale is zh-CN", async () => {
      const user = userEvent.setup();
      mockEq.mockResolvedValueOnce({
        data: null,
        error: new Error("Database error"),
      });

      render(<LevelFormModal {...defaultProps} locale="zh-CN" />);

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

      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      mockEq.mockReturnValueOnce(updatePromise);

      render(<LevelFormModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

      resolveUpdate!({ data: null, error: null });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it("should show loading text during save", async () => {
      const user = userEvent.setup();

      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      mockEq.mockReturnValueOnce(updatePromise);

      render(<LevelFormModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();

      resolveUpdate!({ data: null, error: null });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: "✕" });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onSuccess after successful save", async () => {
      const user = userEvent.setup();
      render(<LevelFormModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });
});
