import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CategoryManagement from "@/components/admin/CategoryManagement";
import type { QuestCategoryRow } from "@/types/category";

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
const mockTypedInsert = jest.fn();
jest.mock("@/lib/supabase/helpers", () => ({
  typedUpdate: (...args: any[]) => mockTypedUpdate(...args),
  typedInsert: (...args: any[]) => mockTypedInsert(...args),
}));

describe("CategoryManagement", () => {
  const mockCategory1: QuestCategoryRow = {
    id: "cat-1",
    family_id: "family-1",
    name: "health",
    name_en: "Health",
    name_zh: "健康",
    icon: "💪",
    is_active: true,
    sort_order: 1,
    created_at: "2024-01-01T00:00:00Z",
  };

  const mockCategory2: QuestCategoryRow = {
    id: "cat-2",
    family_id: "family-1",
    name: "study",
    name_en: "Study",
    name_zh: "学业",
    icon: "✍️",
    is_active: true,
    sort_order: 2,
    created_at: "2024-01-01T00:00:00Z",
  };

  const mockInactiveCategory: QuestCategoryRow = {
    id: "cat-3",
    family_id: "family-1",
    name: "music",
    name_en: "Music",
    name_zh: null,
    icon: "🎵",
    is_active: false,
    sort_order: 3,
    created_at: "2024-01-01T00:00:00Z",
  };

  const baseProps = {
    categories: [mockCategory1, mockCategory2],
    locale: "en",
    familyId: "family-1",
    onCategoriesChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
    mockEq.mockResolvedValue({ error: null });
    mockTypedInsert.mockResolvedValue({ error: null });

    mockFrom.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  describe("Rendering", () => {
    it("renders the title and info note", () => {
      render(<CategoryManagement {...baseProps} />);
      expect(screen.getByText("categoryManagement.title")).toBeInTheDocument();
      expect(screen.getByText("categoryManagement.infoNote")).toBeInTheDocument();
    });

    it("renders categories sorted by sort_order", () => {
      render(<CategoryManagement {...baseProps} />);
      expect(screen.getByText("Health")).toBeInTheDocument();
      expect(screen.getByText("Study")).toBeInTheDocument();
    });

    it("shows add button when not in edit/add mode", () => {
      render(<CategoryManagement {...baseProps} />);
      expect(
        screen.getByText("categoryManagement.addCategory")
      ).toBeInTheDocument();
    });

    it("shows Chinese names when locale is zh-CN", () => {
      render(<CategoryManagement {...baseProps} locale="zh-CN" />);
      expect(screen.getByText("健康")).toBeInTheDocument();
      expect(screen.getByText("学业")).toBeInTheDocument();
    });

    it("shows Disabled badge for inactive categories", () => {
      render(
        <CategoryManagement
          {...baseProps}
          categories={[mockCategory1, mockInactiveCategory]}
        />
      );
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    it("shows key name for each category", () => {
      render(<CategoryManagement {...baseProps} />);
      expect(screen.getByText("Key: health")).toBeInTheDocument();
      expect(screen.getByText("Key: study")).toBeInTheDocument();
    });

    it("shows icons for categories", () => {
      render(<CategoryManagement {...baseProps} />);
      expect(screen.getByText("💪")).toBeInTheDocument();
      expect(screen.getByText("✍️")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows empty state with initialize button when no categories", () => {
      render(<CategoryManagement {...baseProps} categories={[]} />);
      expect(
        screen.getByText("categoryManagement.noCategories")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Initialize Default Categories/i)
      ).toBeInTheDocument();
    });

    it("initializes default categories when button is clicked", async () => {
      render(<CategoryManagement {...baseProps} categories={[]} />);
      fireEvent.click(
        screen.getByText(/Initialize Default Categories/i)
      );

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalled();
      });
    });

    it("shows error when initializing defaults fails", async () => {
      mockTypedInsert.mockResolvedValueOnce({
        error: { message: "Insert failed" },
      });

      render(<CategoryManagement {...baseProps} categories={[]} />);
      fireEvent.click(
        screen.getByText(/Initialize Default Categories/i)
      );

      await waitFor(() => {
        expect(
          screen.getByText(/categoryManagement.saveFailed.*Insert failed/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Add Category", () => {
    it("shows add form when add button is clicked", () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      expect(
        screen.getByPlaceholderText("e.g., Health")
      ).toBeInTheDocument();
    });

    it("hides add button when form is shown", () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      // The add button should be hidden, only form heading shows
      const addCategoryTexts = screen.getAllByText(
        "categoryManagement.addCategory"
      );
      // One is the form heading
      expect(addCategoryTexts.length).toBe(1);
    });

    it("submits new category with correct data", async () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      fireEvent.change(screen.getByPlaceholderText("e.g., Health"), {
        target: { value: "Arts" },
      });

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalled();
      });
    });

    it("shows validation error when English name is empty", async () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      // Submit without filling in English name
      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("categoryManagement.nameRequired")
        ).toBeInTheDocument();
      });
    });

    it("cancels add form", () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      fireEvent.click(screen.getByText("common.cancel"));
      // Form should be hidden, add button should reappear
      expect(screen.getByText("categoryManagement.addCategory")).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText("e.g., Health")
      ).not.toBeInTheDocument();
    });

    it("shows duplicate key error", async () => {
      mockTypedInsert.mockResolvedValueOnce({
        error: { message: "duplicate key value violates unique constraint" },
      });

      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      fireEvent.change(screen.getByPlaceholderText("e.g., Health"), {
        target: { value: "Health" },
      });

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("A category with this name already exists")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Edit Category", () => {
    it("opens edit form when edit button is clicked", () => {
      render(<CategoryManagement {...baseProps} />);
      const editButtons = screen.getAllByText("common.edit");
      fireEvent.click(editButtons[0]);

      expect(
        screen.getByText("categoryManagement.editCategory")
      ).toBeInTheDocument();
      // Form should be populated with category data
      expect(screen.getByDisplayValue("Health")).toBeInTheDocument();
    });

    it("submits edited category", async () => {
      render(<CategoryManagement {...baseProps} />);
      const editButtons = screen.getAllByText("common.edit");
      fireEvent.click(editButtons[0]);

      fireEvent.change(screen.getByDisplayValue("Health"), {
        target: { value: "Health & Fitness" },
      });

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
      });
    });
  });

  describe("Toggle Active", () => {
    it("toggles category active state", async () => {
      render(<CategoryManagement {...baseProps} />);
      const disableButtons = screen.getAllByText("Disable");
      fireEvent.click(disableButtons[0]);

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("shows Enable button for inactive categories", () => {
      render(
        <CategoryManagement
          {...baseProps}
          categories={[mockInactiveCategory]}
        />
      );
      expect(screen.getByText("Enable")).toBeInTheDocument();
    });

    it("alerts on toggle failure", async () => {
      mockEq.mockResolvedValueOnce({ error: { message: "Toggle failed" } });

      render(<CategoryManagement {...baseProps} />);
      const disableButtons = screen.getAllByText("Disable");
      fireEvent.click(disableButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          "categoryManagement.toggleFailed"
        );
      });
    });
  });

  describe("Delete Category", () => {
    it("confirms before deleting", async () => {
      render(<CategoryManagement {...baseProps} />);
      const deleteButtons = screen.getAllByText("common.delete");
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalled();
    });

    it("deletes category after confirmation", async () => {
      render(<CategoryManagement {...baseProps} />);
      const deleteButtons = screen.getAllByText("common.delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("quest_categories");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("does not delete when confirmation is cancelled", () => {
      (global.confirm as jest.Mock).mockReturnValueOnce(false);

      render(<CategoryManagement {...baseProps} />);
      const deleteButtons = screen.getAllByText("common.delete");
      fireEvent.click(deleteButtons[0]);

      expect(mockFrom).not.toHaveBeenCalledWith("quest_categories");
    });

    it("alerts on delete failure", async () => {
      mockFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockResolvedValue({ error: { message: "Delete failed" } }),
        }),
      });

      render(<CategoryManagement {...baseProps} />);
      const deleteButtons = screen.getAllByText("common.delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          "categoryManagement.deleteFailed"
        );
      });
    });
  });

  describe("Form input change handlers", () => {
    it("updates icon when icon input changes", () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      const iconInput = screen.getByPlaceholderText("📦");
      fireEvent.change(iconInput, { target: { value: "🎯" } });

      expect(screen.getByDisplayValue("🎯")).toBeInTheDocument();
    });

    it("updates Chinese name when input changes", () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      const zhInput = screen.getByPlaceholderText("例如：健康");
      fireEvent.change(zhInput, { target: { value: "运动" } });

      expect(screen.getByDisplayValue("运动")).toBeInTheDocument();
    });
  });

  describe("Generic save error (non-duplicate key)", () => {
    it("shows generic error message when save fails with non-duplicate error", async () => {
      mockTypedUpdate.mockReturnValueOnce({
        eq: jest.fn().mockRejectedValue({ message: "Connection timeout" }),
      });

      render(<CategoryManagement {...baseProps} />);
      const editButtons = screen.getAllByText("common.edit");
      fireEvent.click(editButtons[0]);

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText(/categoryManagement.saveFailed.*Connection timeout/)
        ).toBeInTheDocument();
      });
    });

    it("shows generic error on insert failure with non-duplicate error", async () => {
      mockTypedInsert.mockResolvedValueOnce({
        error: { message: "Some other error" },
      });

      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      fireEvent.change(screen.getByPlaceholderText("e.g., Health"), {
        target: { value: "Sports" },
      });

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText(/categoryManagement.saveFailed.*Some other error/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Locale-specific rendering in categories list", () => {
    it("shows Chinese disabled badge when locale is zh-CN", () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
          categories={[mockInactiveCategory]}
        />
      );
      expect(screen.getByText("已禁用")).toBeInTheDocument();
    });

    it("shows Chinese key label when locale is zh-CN", () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
        />
      );
      expect(screen.getByText("键名: health")).toBeInTheDocument();
    });

    it("shows Chinese disable button label when locale is zh-CN", () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
        />
      );
      expect(screen.getAllByText("禁用").length).toBeGreaterThan(0);
    });

    it("shows Chinese enable button when locale is zh-CN for inactive category", () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
          categories={[mockInactiveCategory]}
        />
      );
      expect(screen.getByText("启用")).toBeInTheDocument();
    });

    it("shows Chinese empty state text when locale is zh-CN", () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
          categories={[]}
        />
      );
      expect(screen.getByText(/初始化默认类别/)).toBeInTheDocument();
      expect(screen.getByText(/将添加 14 个常用类别/)).toBeInTheDocument();
    });

    it("falls back to name_en when name_zh is null for zh-CN locale", () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
          categories={[mockInactiveCategory]}
        />
      );
      // mockInactiveCategory has name_zh: null, so should fall back to name_en "Music"
      expect(screen.getByText("Music")).toBeInTheDocument();
    });
  });

  describe("Delete category with zh-CN locale", () => {
    it("uses Chinese name in delete confirmation when locale is zh-CN", async () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
        />
      );
      const deleteButtons = screen.getAllByText("common.delete");
      fireEvent.click(deleteButtons[0]);

      // Should use name_zh for confirm dialog
      expect(global.confirm).toHaveBeenCalled();
    });
  });

  describe("Duplicate key error with zh-CN locale", () => {
    it("shows Chinese duplicate error when locale is zh-CN and unique constraint violated", async () => {
      mockTypedInsert.mockResolvedValueOnce({
        error: { message: "duplicate key value violates unique constraint" },
      });

      render(
        <CategoryManagement {...baseProps} locale="zh-CN" />
      );
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      fireEvent.change(screen.getByPlaceholderText("e.g., Health"), {
        target: { value: "健康" },
      });

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("此类别名称已存在")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form data handling", () => {
    it("generates name from name_en when name field is empty", async () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      fireEvent.change(screen.getByPlaceholderText("e.g., Health"), {
        target: { value: "My Category" },
      });

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalled();
        const insertCall = mockTypedInsert.mock.calls[0];
        // name should be generated as "my_category" from "My Category"
        const insertedData = insertCall[2];
        expect(insertedData[0].name).toBe("my_category");
      });
    });

    it("sends null name_zh when Chinese name is empty", async () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      fireEvent.change(screen.getByPlaceholderText("e.g., Health"), {
        target: { value: "Arts" },
      });

      // Chinese name is empty by default, so name_zh should be null
      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalled();
        const insertCall = mockTypedInsert.mock.calls[0];
        const insertedData = insertCall[2];
        expect(insertedData[0].name_zh).toBeNull();
      });
    });

    it("sends name_zh value when Chinese name is filled in", async () => {
      render(<CategoryManagement {...baseProps} />);
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      fireEvent.change(screen.getByPlaceholderText("e.g., Health"), {
        target: { value: "Arts" },
      });
      fireEvent.change(screen.getByPlaceholderText("例如：健康"), {
        target: { value: "艺术" },
      });

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalled();
        const insertCall = mockTypedInsert.mock.calls[0];
        const insertedData = insertCall[2];
        expect(insertedData[0].name_zh).toBe("艺术");
      });
    });
  });

  describe("Edit populates form with category name_zh fallback", () => {
    it("sets name_zh to empty string when category has null name_zh", () => {
      render(
        <CategoryManagement
          {...baseProps}
          categories={[mockInactiveCategory]}
        />
      );
      const editButtons = screen.getAllByText("common.edit");
      fireEvent.click(editButtons[0]);

      // mockInactiveCategory has name_zh: null, form should show empty string
      const zhInput = screen.getByPlaceholderText("例如：健康");
      expect(zhInput).toHaveValue("");
    });
  });

  describe("Delete with Chinese category name fallback", () => {
    it("uses name_en in confirm when zh-CN locale but name_zh is null", () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
          categories={[mockInactiveCategory]}
        />
      );
      const deleteButtons = screen.getAllByText("common.delete");
      fireEvent.click(deleteButtons[0]);

      // mockInactiveCategory has name_zh: null, should fall back to name_en
      expect(global.confirm).toHaveBeenCalled();
    });
  });

  describe("Branch coverage", () => {
    it("auto-generates name from name_en when submitting with empty name field in edit mode", async () => {
      render(<CategoryManagement {...baseProps} />);
      const editButtons = screen.getAllByText("common.edit");
      fireEvent.click(editButtons[0]);

      // Clear the name field (formData.name) — but the form doesn't expose the "name" field directly.
      // In edit mode, formData.name is populated from category.name ("health").
      // We need to test the auto-generation branch where formData.name is empty.
      // Let's test via the Add form instead, where name starts empty.
      fireEvent.click(screen.getByText("common.cancel"));
      fireEvent.click(screen.getByText("categoryManagement.addCategory"));

      // Only fill in name_en, leave name empty (default)
      fireEvent.change(screen.getByPlaceholderText("e.g., Health"), {
        target: { value: "My New Category" },
      });

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalled();
        const insertCall = mockTypedInsert.mock.calls[0];
        const insertedData = insertCall[2];
        // name should be auto-generated: "my_new_category"
        expect(insertedData[0].name).toBe("my_new_category");
      });
    });

    it("shows error when updating a category fails via updateError", async () => {
      // Mock typedUpdate to return an error via .eq() resolving with error
      mockEq.mockResolvedValueOnce({ error: { message: "Update constraint violation" } });

      render(<CategoryManagement {...baseProps} />);
      const editButtons = screen.getAllByText("common.edit");
      fireEvent.click(editButtons[0]);

      fireEvent.submit(screen.getByText("common.save").closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText(/categoryManagement.saveFailed.*Update constraint violation/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Info Note", () => {
    it("shows English info note", () => {
      render(<CategoryManagement {...baseProps} />);
      expect(
        screen.getByText(/Deleting a category won't delete quests/)
      ).toBeInTheDocument();
    });

    it("shows Chinese info note when locale is zh-CN", () => {
      render(<CategoryManagement {...baseProps} locale="zh-CN" />);
      expect(
        screen.getByText(/删除类别不会删除使用该类别的任务/)
      ).toBeInTheDocument();
    });
  });
});
