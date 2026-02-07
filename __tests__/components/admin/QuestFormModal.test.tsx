import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestFormModal from "@/components/admin/QuestFormModal";
import type { Quest } from "@/types/quest";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe("QuestFormModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockQuest: Quest = {
    id: "quest-123",
    family_id: "family-123",
    name_en: "Make the bed",
    name_zh: "整理床铺",
    type: "duty",
    scope: "self",
    category: "chores",
    stars: 5,
    icon: "🛏️",
    is_active: true,
    created_at: "2025-01-01",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for insert
    mockFrom.mockReturnValue({
      insert: mockInsert.mockResolvedValue({ error: null }),
    });

    // Default mock for update
    mockUpdate.mockReturnValue({
      eq: mockEq.mockResolvedValue({ error: null }),
    });
  });

  describe("Create Mode", () => {
    it("should render with 'Add Quest' title in English", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Add Quest")).toBeInTheDocument();
    });

    it("should render with '添加任务' title in Chinese", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("添加任务")).toBeInTheDocument();
    });

    it("should have default values for new quest", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameEnInput = screen.getByPlaceholderText("e.g., Make the bed");
      const nameZhInput = screen.getByPlaceholderText("例如：整理床铺");
      const starsInput = screen.getByRole("spinbutton") as HTMLInputElement;
      const iconInput = screen.getByPlaceholderText("📝") as HTMLInputElement;
      const activeCheckbox = screen.getByRole("checkbox");

      expect(nameEnInput).toHaveValue("");
      expect(nameZhInput).toHaveValue("");
      expect(starsInput.value).toBe("0");
      expect(iconInput.value).toBe("⭐"); // Default for bonus type
      expect(activeCheckbox).toBeChecked();
    });

    it("should update icon when type changes", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const iconInput = screen.getByPlaceholderText("📝") as HTMLInputElement;

      // Initial icon for bonus type
      expect(iconInput.value).toBe("⭐");

      // Change to duty
      const dutyButton = screen.getByRole("button", { name: "Duty" });
      await user.click(dutyButton);

      expect(iconInput.value).toBe("📋");

      // Change to violation
      const violationButton = screen.getByRole("button", { name: "Violation" });
      await user.click(violationButton);

      expect(iconInput.value).toBe("⚠️");
    });
  });

  describe("Edit Mode", () => {
    it("should render with 'Edit Quest' title in English", () => {
      render(
        <QuestFormModal
          quest={mockQuest}
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Edit Quest")).toBeInTheDocument();
    });

    it("should render with '编辑任务' title in Chinese", () => {
      render(
        <QuestFormModal
          quest={mockQuest}
          familyId="family-123"
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("编辑任务")).toBeInTheDocument();
    });

    it("should pre-fill form with quest data", () => {
      render(
        <QuestFormModal
          quest={mockQuest}
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameEnInput = screen.getByPlaceholderText("e.g., Make the bed");
      const nameZhInput = screen.getByPlaceholderText("例如：整理床铺");
      const starsInput = screen.getByRole("spinbutton") as HTMLInputElement;
      const iconInput = screen.getByPlaceholderText("📝") as HTMLInputElement;
      const activeCheckbox = screen.getByRole("checkbox");

      expect(nameEnInput).toHaveValue("Make the bed");
      expect(nameZhInput).toHaveValue("整理床铺");
      expect(starsInput.value).toBe("5");
      expect(iconInput.value).toBe("🛏️");
      expect(activeCheckbox).toBeChecked();
    });

    it("should not change icon when type changes in edit mode", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          quest={mockQuest}
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const iconInput = screen.getByPlaceholderText("📝") as HTMLInputElement;
      const originalIcon = iconInput.value;

      // Change type
      const bonusButton = screen.getByRole("button", { name: "Bonus" });
      await user.click(bonusButton);

      // Icon should not change in edit mode
      expect(iconInput.value).toBe(originalIcon);
    });
  });

  describe("Form Fields", () => {
    it("should update English name field", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameEnInput = screen.getByPlaceholderText("e.g., Make the bed");
      await user.type(nameEnInput, "Clean room");

      expect(nameEnInput).toHaveValue("Clean room");
    });

    it("should update Chinese name field", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameZhInput = screen.getByPlaceholderText("例如：整理床铺");
      await user.type(nameZhInput, "打扫房间");

      expect(nameZhInput).toHaveValue("打扫房间");
    });

    it("should select quest type", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const dutyButton = screen.getByRole("button", { name: "Duty" });
      await user.click(dutyButton);

      expect(dutyButton.className).toContain("border-primary");
    });

    it("should select quest scope", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const familyButton = screen.getByRole("button", { name: "Family" });
      await user.click(familyButton);

      expect(familyButton.className).toContain("border-secondary");
    });

    it("should select category", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const categorySelect = screen.getByRole("combobox");
      await user.selectOptions(categorySelect, "health");

      expect(categorySelect).toHaveValue("health");
    });

    it("should update stars value", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const starsInput = screen.getByRole("spinbutton");
      await user.clear(starsInput);
      await user.type(starsInput, "10");

      expect(starsInput).toHaveValue(10);
    });

    it("should update icon", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const iconInput = screen.getByPlaceholderText("📝");
      await user.clear(iconInput);
      await user.type(iconInput, "🎯");

      expect(iconInput).toHaveValue("🎯");
    });

    it("should toggle active status", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const activeCheckbox = screen.getByRole("checkbox");
      expect(activeCheckbox).toBeChecked();

      await user.click(activeCheckbox);
      expect(activeCheckbox).not.toBeChecked();

      await user.click(activeCheckbox);
      expect(activeCheckbox).toBeChecked();
    });
  });

  describe("Validation", () => {
    it("should have required attribute on English name field", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameEnInput = screen.getByPlaceholderText("e.g., Make the bed");
      expect(nameEnInput).toHaveAttribute("required");
    });

    it("should show error when English name is whitespace only", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameEnInput = screen.getByPlaceholderText("e.g., Make the bed");
      await user.type(nameEnInput, "   ");

      const submitButton = screen.getByRole("button", { name: "Create Quest" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("English name is required")).toBeInTheDocument();
      });

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should show error in Chinese when English name is whitespace only", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameEnInput = screen.getByPlaceholderText("e.g., Make the bed");
      await user.type(nameEnInput, "   ");

      const submitButton = screen.getByRole("button", { name: "创建任务" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("请输入英文名称")).toBeInTheDocument();
      });

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should trim whitespace from names", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameEnInput = screen.getByPlaceholderText("e.g., Make the bed");
      const nameZhInput = screen.getByPlaceholderText("例如：整理床铺");

      await user.type(nameEnInput, "  Clean room  ");
      await user.type(nameZhInput, "  打扫房间  ");

      const submitButton = screen.getByRole("button", { name: "Create Quest" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name_en: "Clean room",
            name_zh: "打扫房间",
          }),
        ]);
      });
    });
  });

  describe("Create Quest Flow", () => {
    it("should create quest with all fields", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByPlaceholderText("e.g., Make the bed"), "Test Quest");
      await user.type(screen.getByPlaceholderText("例如：整理床铺"), "测试任务");
      await user.click(screen.getByRole("button", { name: "Duty" }));
      await user.click(screen.getByRole("button", { name: "Family" }));
      await user.selectOptions(screen.getByRole("combobox"), "health");
      await user.clear(screen.getByRole("spinbutton"));
      await user.type(screen.getByRole("spinbutton"), "10");
      await user.clear(screen.getByPlaceholderText("📝"));
      await user.type(screen.getByPlaceholderText("📝"), "🏥");

      const submitButton = screen.getByRole("button", { name: "Create Quest" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          {
            family_id: "family-123",
            name_en: "Test Quest",
            name_zh: "测试任务",
            type: "duty",
            scope: "family",
            category: "health",
            stars: 10,
            icon: "🏥",
            is_active: true,
          },
        ]);
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should create quest with null category when not selected", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByPlaceholderText("e.g., Make the bed"), "Test Quest");

      const submitButton = screen.getByRole("button", { name: "Create Quest" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            category: null,
          }),
        ]);
      });
    });

    it("should create quest with null Chinese name when empty", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByPlaceholderText("e.g., Make the bed"), "Test Quest");

      const submitButton = screen.getByRole("button", { name: "Create Quest" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name_zh: null,
          }),
        ]);
      });
    });

    it("should show error when create fails", async () => {
      const user = userEvent.setup();

      mockFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { message: "Database error" },
        }),
      });

      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByPlaceholderText("e.g., Make the bed"), "Test Quest");

      const submitButton = screen.getByRole("button", { name: "Create Quest" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Save failed: Database error")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Update Quest Flow", () => {
    beforeEach(() => {
      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null }),
      });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });
    });

    it("should update quest with modified fields", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          quest={mockQuest}
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameEnInput = screen.getByPlaceholderText("e.g., Make the bed");
      await user.clear(nameEnInput);
      await user.type(nameEnInput, "Updated Quest");

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          family_id: "family-123",
          name_en: "Updated Quest",
          name_zh: "整理床铺",
          type: "duty",
          scope: "self",
          category: "chores",
          stars: 5,
          icon: "🛏️",
          is_active: true,
        });
      });

      expect(mockEq).toHaveBeenCalledWith("id", "quest-123");
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should show error when update fails", async () => {
      const user = userEvent.setup();

      mockEq.mockResolvedValue({
        error: { message: "Update failed" },
      });

      render(
        <QuestFormModal
          quest={mockQuest}
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Save failed: Update failed")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("should show loading text during create", async () => {
      const user = userEvent.setup();

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve({ error: null }), 100);
            })
        ),
      });

      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByPlaceholderText("e.g., Make the bed"), "Test Quest");

      const submitButton = screen.getByRole("button", { name: "Create Quest" });
      await user.click(submitButton);

      expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should disable buttons during loading", async () => {
      const user = userEvent.setup();

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve({ error: null }), 100);
            })
        ),
      });

      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByPlaceholderText("e.g., Make the bed"), "Test Quest");

      const submitButton = screen.getByRole("button", { name: "Create Quest" });
      await user.click(submitButton);

      const savingButton = screen.getByRole("button", { name: "Saving..." });
      const cancelButton = screen.getByRole("button", { name: "Cancel" });

      expect(savingButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
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
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Category Handling", () => {
    const mockCategories = [
      {
        id: "cat-1",
        family_id: "family-123",
        name: "health",
        name_en: "Health",
        name_zh: "健康",
        icon: "💪",
        is_active: true,
        sort_order: 2,
        created_at: "2025-01-01",
      },
      {
        id: "cat-2",
        family_id: "family-123",
        name: "study",
        name_en: "Study",
        name_zh: "学业",
        icon: "✍️",
        is_active: false,
        sort_order: 1,
        created_at: "2025-01-01",
      },
      {
        id: "cat-3",
        family_id: "family-123",
        name: "chores",
        name_en: "Chores",
        name_zh: "家务",
        icon: "🧹",
        is_active: true,
        sort_order: 3,
        created_at: "2025-01-01",
      },
    ];

    it("should render DEFAULT_CATEGORY_NAMES when categories array is empty", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          categories={[]}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const categorySelect = screen.getByRole("combobox");
      // DEFAULT_CATEGORY_NAMES has 14 items + 1 placeholder option = 15 options
      const options = categorySelect.querySelectorAll("option");
      expect(options.length).toBe(15); // 1 placeholder + 14 default

      // Verify specific default categories are present as option elements (capitalized)
      const optionTexts = Array.from(options).map((o) => o.textContent);
      expect(optionTexts).toContain("Health");
      expect(optionTexts).toContain("Study");
      expect(optionTexts).toContain("Chores");
      expect(optionTexts).toContain("Other");
    });

    it("should render DEFAULT_CATEGORY_NAMES when all categories are inactive", () => {
      const allInactive = mockCategories.map((c) => ({ ...c, is_active: false }));
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          categories={allInactive}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const categorySelect = screen.getByRole("combobox");
      const options = categorySelect.querySelectorAll("option");
      // Should fall back to DEFAULT_CATEGORY_NAMES (14) + 1 placeholder
      expect(options.length).toBe(15);

      // Verify default category names are rendered (capitalized first letter)
      expect(screen.getByText("Hygiene")).toBeInTheDocument();
      expect(screen.getByText("Creativity")).toBeInTheDocument();
    });

    it("should filter out inactive categories and only render active ones", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          categories={mockCategories}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const categorySelect = screen.getByRole("combobox");
      const options = categorySelect.querySelectorAll("option");
      // 2 active categories + 1 placeholder = 3 options
      expect(options.length).toBe(3);

      // Active categories should be present (with icons)
      expect(screen.getByText(/Health/)).toBeInTheDocument();
      expect(screen.getByText(/Chores/)).toBeInTheDocument();

      // Inactive category (Study) should NOT be in the dropdown
      // The option text format is "icon name_en", so check for "✍️ Study"
      const optionTexts = Array.from(options).map((o) => o.textContent);
      expect(optionTexts.some((t) => t?.includes("Study"))).toBe(false);
    });

    it("should sort active categories by sort_order", () => {
      // Health has sort_order 2, Chores has sort_order 3
      // After filtering inactive (Study sort_order 1), order should be Health, Chores
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          categories={mockCategories}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const categorySelect = screen.getByRole("combobox");
      const options = categorySelect.querySelectorAll("option");
      // Skip placeholder (index 0), check order of active categories
      expect(options[1].textContent).toContain("Health");
      expect(options[2].textContent).toContain("Chores");
    });

    it("should display Chinese category names when locale is zh-CN", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="zh-CN"
          categories={mockCategories}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const categorySelect = screen.getByRole("combobox");
      const options = categorySelect.querySelectorAll("option");

      // Active categories should show Chinese names
      expect(options[1].textContent).toContain("健康");
      expect(options[2].textContent).toContain("家务");
    });

    it("should render DEFAULT_CATEGORY_NAMES when categories prop is not provided", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="en"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // categories defaults to [], which means activeCategories.length === 0
      // so DEFAULT_CATEGORY_NAMES should be used
      const categorySelect = screen.getByRole("combobox");
      const options = categorySelect.querySelectorAll("option");
      expect(options.length).toBe(15); // 1 placeholder + 14 defaults
    });
  });

  describe("Branch coverage", () => {
    it("should show Chinese save failure error on insert failure with zh-CN locale", async () => {
      const user = userEvent.setup();

      mockFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { message: "Disk full" },
        }),
      });

      render(
        <QuestFormModal
          familyId="family-123"
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByPlaceholderText("e.g., Make the bed"), "Test");

      const submitButton = screen.getByRole("button", { name: "创建任务" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("保存失败: Disk full")).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should render edit mode title in zh-CN as '编辑任务'", () => {
      render(
        <QuestFormModal
          quest={mockQuest}
          familyId="family-123"
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("编辑任务")).toBeInTheDocument();
    });
  });

  describe("Localization", () => {
    it("should display Chinese labels when locale is zh-CN", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("英文名称")).toBeInTheDocument();
      expect(screen.getByText("中文名称")).toBeInTheDocument();
      expect(screen.getByText("任务类型")).toBeInTheDocument();
      expect(screen.getByText("任务范围")).toBeInTheDocument();
      expect(screen.getByText("类别")).toBeInTheDocument();
      expect(screen.getByText("星星数量")).toBeInTheDocument();
      expect(screen.getByText("图标")).toBeInTheDocument();
    });

    it("should display Chinese type labels", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("button", { name: "职责" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "奖励" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "违规" })).toBeInTheDocument();
    });

    it("should display Chinese scope labels", () => {
      render(
        <QuestFormModal
          familyId="family-123"
          locale="zh-CN"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("button", { name: "自己" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "家人" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "他人" })).toBeInTheDocument();
    });
  });
});
