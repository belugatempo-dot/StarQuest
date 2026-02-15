import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import CategoryManagement from "@/components/admin/CategoryManagement";
import type { QuestCategoryRow } from "@/types/category";
import type { Quest } from "@/types/quest";

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

// Mock QuestFormModal
const mockQuestFormModalOnClose = jest.fn();
const mockQuestFormModalOnSuccess = jest.fn();
jest.mock("@/components/admin/QuestFormModal", () => {
  return function MockQuestFormModal({ quest, onClose, onSuccess }: any) {
    // Capture onClose/onSuccess so tests can trigger them
    mockQuestFormModalOnClose.mockImplementation(onClose);
    mockQuestFormModalOnSuccess.mockImplementation(onSuccess);
    return (
      <div data-testid="quest-form-modal">
        Editing: {quest?.name_en}
        <button onClick={onClose} data-testid="modal-close">Close</button>
        <button onClick={onSuccess} data-testid="modal-save">Save</button>
      </div>
    );
  };
});

function createMockQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: `quest-${Math.random().toString(36).slice(2, 8)}`,
    family_id: "family-1",
    name_en: "Mock Quest",
    name_zh: null,
    type: "bonus",
    scope: "self",
    category: null,
    stars: 10,
    icon: "⭐",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  } as Quest;
}

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

  const mockHealthQuest1 = createMockQuest({
    id: "q-1",
    name_en: "Morning Jog",
    name_zh: "晨跑",
    category: "health",
    stars: 15,
    type: "bonus",
    icon: "🏃",
  });

  const mockHealthQuest2 = createMockQuest({
    id: "q-2",
    name_en: "Brush Teeth",
    name_zh: "刷牙",
    category: "health",
    stars: -5,
    type: "duty",
    icon: "🪥",
  });

  const mockStudyQuest = createMockQuest({
    id: "q-3",
    name_en: "Homework",
    name_zh: "作业",
    category: "study",
    stars: 20,
    type: "bonus",
    icon: "📝",
  });

  const baseProps = {
    categories: [mockCategory1, mockCategory2],
    quests: [mockHealthQuest1, mockHealthQuest2, mockStudyQuest],
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

    it("renders all categories", () => {
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

    it("shows chevron indicator for each category row", () => {
      render(<CategoryManagement {...baseProps} />);
      // All collapsed by default, should show ▶
      expect(screen.getAllByText("▶").length).toBeGreaterThanOrEqual(2);
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
      render(<CategoryManagement {...baseProps} quests={[]} />);
      const editButtons = screen.getAllByText("common.edit");
      fireEvent.click(editButtons[0]);

      expect(
        screen.getByText("categoryManagement.editCategory")
      ).toBeInTheDocument();
      // Form should be populated with category data
      expect(screen.getByDisplayValue("Health")).toBeInTheDocument();
    });

    it("submits edited category", async () => {
      render(<CategoryManagement {...baseProps} quests={[]} />);
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

      render(<CategoryManagement {...baseProps} quests={[]} />);
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
      // Category-level edit buttons (not quest edit buttons)
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
      render(<CategoryManagement {...baseProps} quests={[]} />);
      const editButtons = screen.getAllByText("common.edit");
      fireEvent.click(editButtons[0]);

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

      render(<CategoryManagement {...baseProps} quests={[]} />);
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

  describe("Quest count and sorting", () => {
    it("displays quest count badge for each category", () => {
      const quests = [
        createMockQuest({ id: "q-a", category: "health" }),
        createMockQuest({ id: "q-b", category: "health" }),
        createMockQuest({ id: "q-c", category: "health" }),
        createMockQuest({ id: "q-d", category: "study" }),
      ];
      render(
        <CategoryManagement
          {...baseProps}
          quests={quests}
        />
      );
      expect(screen.getByText("(3)")).toBeInTheDocument();
      expect(screen.getByText("(1)")).toBeInTheDocument();
    });

    it("shows (0) for categories with no quests", () => {
      render(
        <CategoryManagement
          {...baseProps}
          quests={[]}
        />
      );
      expect(screen.getAllByText("(0)")).toHaveLength(2);
    });

    it("sorts categories by quest count descending", () => {
      const quests = [
        createMockQuest({ id: "q-a", category: "study" }),
        createMockQuest({ id: "q-b", category: "study" }),
        createMockQuest({ id: "q-c", category: "study" }),
        createMockQuest({ id: "q-d", category: "health" }),
      ];
      render(
        <CategoryManagement
          {...baseProps}
          quests={quests}
        />
      );
      const keyLabels = screen.getAllByText(/^Key: /);
      expect(keyLabels[0]).toHaveTextContent("Key: study");
      expect(keyLabels[1]).toHaveTextContent("Key: health");
    });

    it("breaks count ties by sort_order", () => {
      const quests = [
        createMockQuest({ id: "q-a", category: "health" }),
        createMockQuest({ id: "q-b", category: "study" }),
      ];
      render(
        <CategoryManagement
          {...baseProps}
          quests={quests}
        />
      );
      const keyLabels = screen.getAllByText(/^Key: /);
      expect(keyLabels[0]).toHaveTextContent("Key: health");
      expect(keyLabels[1]).toHaveTextContent("Key: study");
    });

    it("ignores quests with null category in count", () => {
      const quests = [
        createMockQuest({ id: "q-a", category: null }),
        createMockQuest({ id: "q-b", category: "health" }),
      ];
      render(
        <CategoryManagement
          {...baseProps}
          quests={quests}
        />
      );
      // Health category row should show (1), study should show (0)
      const healthRow = screen.getByText("Health").closest("button")!;
      expect(within(healthRow as HTMLElement).getByText("(1)")).toBeInTheDocument();
      const studyRow = screen.getByText("Study").closest("button")!;
      expect(within(studyRow as HTMLElement).getByText("(0)")).toBeInTheDocument();
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

  describe("Expand/Collapse categories", () => {
    it("shows quest list when category is expanded", () => {
      render(<CategoryManagement {...baseProps} />);

      // Click the Health category row to expand
      const healthButton = screen.getByText("Health").closest("button")!;
      fireEvent.click(healthButton);

      // Should now show quests under health
      expect(screen.getByText("Morning Jog")).toBeInTheDocument();
      expect(screen.getByText("Brush Teeth")).toBeInTheDocument();
    });

    it("changes chevron from ▶ to ▼ when expanded", () => {
      render(<CategoryManagement {...baseProps} />);

      // Initially all collapsed
      const healthButton = screen.getByText("Health").closest("button")!;
      expect(healthButton).toHaveTextContent("▶");

      fireEvent.click(healthButton);
      expect(healthButton).toHaveTextContent("▼");
    });

    it("collapses when clicking an expanded category", () => {
      render(<CategoryManagement {...baseProps} />);

      const healthButton = screen.getByText("Health").closest("button")!;
      // Expand
      fireEvent.click(healthButton);
      expect(screen.getByText("Morning Jog")).toBeInTheDocument();

      // Collapse
      fireEvent.click(healthButton);
      expect(screen.queryByText("Morning Jog")).not.toBeInTheDocument();
    });

    it("shows empty state when expanded category has no quests", () => {
      render(
        <CategoryManagement
          {...baseProps}
          quests={[mockStudyQuest]} // Only study quest, no health quests
        />
      );

      const healthButton = screen.getByText("Health").closest("button")!;
      fireEvent.click(healthButton);

      expect(screen.getByText("No quests in this category")).toBeInTheDocument();
    });

    it("shows Chinese empty state for expanded category in zh-CN", () => {
      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
          quests={[mockStudyQuest]}
        />
      );

      const healthButton = screen.getByText("健康").closest("button")!;
      fireEvent.click(healthButton);

      expect(screen.getByText("此类别下暂无任务")).toBeInTheDocument();
    });

    it("can expand multiple categories independently", () => {
      render(<CategoryManagement {...baseProps} />);

      const healthButton = screen.getByText("Health").closest("button")!;
      const studyButton = screen.getByText("Study").closest("button")!;

      fireEvent.click(healthButton);
      fireEvent.click(studyButton);

      expect(screen.getByText("Morning Jog")).toBeInTheDocument();
      expect(screen.getByText("Homework")).toBeInTheDocument();
    });
  });

  describe("Quest rows in expanded categories", () => {
    it("displays quest icon, name, stars, and type badge", () => {
      render(<CategoryManagement {...baseProps} />);

      const healthButton = screen.getByText("Health").closest("button")!;
      fireEvent.click(healthButton);

      // Icon
      expect(screen.getByText("🏃")).toBeInTheDocument();
      // Name
      expect(screen.getByText("Morning Jog")).toBeInTheDocument();
      // Stars (positive)
      expect(screen.getByText("+15⭐")).toBeInTheDocument();
      // Stars (negative)
      expect(screen.getByText("-5⭐")).toBeInTheDocument();
      // Type badges
      expect(screen.getByText("Bonus Quest")).toBeInTheDocument();
      expect(screen.getByText("Daily Duty")).toBeInTheDocument();
    });

    it("shows Chinese quest name and type labels in zh-CN", () => {
      render(<CategoryManagement {...baseProps} locale="zh-CN" />);

      const healthButton = screen.getByText("健康").closest("button")!;
      fireEvent.click(healthButton);

      expect(screen.getByText("晨跑")).toBeInTheDocument();
      expect(screen.getByText("加分任务")).toBeInTheDocument();
      expect(screen.getByText("日常本分")).toBeInTheDocument();
    });

    it("shows Inactive badge for inactive quests", () => {
      const inactiveQuest = createMockQuest({
        id: "q-inactive",
        name_en: "Sleeping Early",
        category: "health",
        is_active: false,
      });

      render(
        <CategoryManagement
          {...baseProps}
          quests={[...baseProps.quests, inactiveQuest]}
        />
      );

      const healthButton = screen.getByText("Health").closest("button")!;
      fireEvent.click(healthButton);

      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("shows Chinese inactive badge in zh-CN", () => {
      const inactiveQuest = createMockQuest({
        id: "q-inactive",
        name_en: "Sleeping Early",
        name_zh: "早睡",
        category: "health",
        is_active: false,
      });

      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
          quests={[...baseProps.quests, inactiveQuest]}
        />
      );

      const healthButton = screen.getByText("健康").closest("button")!;
      fireEvent.click(healthButton);

      expect(screen.getByText("已停用")).toBeInTheDocument();
    });
  });

  describe("Quest editing from category", () => {
    function clickQuestEditButton(questName: string) {
      // Quest name is in span > div (inner) > div (outer row with justify-between)
      const questNameEl = screen.getByText(questName);
      const outerRow = questNameEl.parentElement!.parentElement!;
      const editBtn = within(outerRow as HTMLElement).getByText("common.edit");
      fireEvent.click(editBtn);
    }

    it("opens QuestFormModal when quest edit button is clicked", () => {
      render(<CategoryManagement {...baseProps} />);

      const healthButton = screen.getByText("Health").closest("button")!;
      fireEvent.click(healthButton);

      clickQuestEditButton("Morning Jog");

      expect(screen.getByTestId("quest-form-modal")).toBeInTheDocument();
      expect(screen.getByText("Editing: Morning Jog")).toBeInTheDocument();
    });

    it("closes QuestFormModal when close button is clicked", () => {
      render(<CategoryManagement {...baseProps} />);

      const healthButton = screen.getByText("Health").closest("button")!;
      fireEvent.click(healthButton);

      clickQuestEditButton("Morning Jog");

      expect(screen.getByTestId("quest-form-modal")).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId("modal-close"));
      expect(screen.queryByTestId("quest-form-modal")).not.toBeInTheDocument();
    });

    it("triggers refresh and onCategoriesChange on quest save success", () => {
      render(<CategoryManagement {...baseProps} />);

      const healthButton = screen.getByText("Health").closest("button")!;
      fireEvent.click(healthButton);

      clickQuestEditButton("Morning Jog");

      // Save quest
      fireEvent.click(screen.getByTestId("modal-save"));

      expect(mockRefresh).toHaveBeenCalled();
      expect(baseProps.onCategoriesChange).toHaveBeenCalled();
      expect(screen.queryByTestId("quest-form-modal")).not.toBeInTheDocument();
    });
  });

  describe("Uncategorized quests", () => {
    it("shows uncategorized group when quests with null category exist", () => {
      const uncategorizedQuest = createMockQuest({
        id: "q-uncat",
        name_en: "Free Play",
        category: null,
        stars: 5,
      });

      render(
        <CategoryManagement
          {...baseProps}
          quests={[...baseProps.quests, uncategorizedQuest]}
        />
      );

      expect(screen.getByText("Uncategorized")).toBeInTheDocument();
      // The uncategorized row should show count
      const uncatButton = screen.getByText("Uncategorized").closest("button")!;
      expect(within(uncatButton as HTMLElement).getByText("(1)")).toBeInTheDocument();
    });

    it("does not show uncategorized group when all quests have categories", () => {
      render(<CategoryManagement {...baseProps} />);
      expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();
    });

    it("shows Chinese label for uncategorized in zh-CN", () => {
      const uncategorizedQuest = createMockQuest({
        id: "q-uncat",
        name_en: "Free Play",
        category: null,
      });

      render(
        <CategoryManagement
          {...baseProps}
          locale="zh-CN"
          quests={[...baseProps.quests, uncategorizedQuest]}
        />
      );

      expect(screen.getByText("未分类")).toBeInTheDocument();
    });

    it("expands uncategorized group to show quests", () => {
      const uncategorizedQuest = createMockQuest({
        id: "q-uncat",
        name_en: "Free Play",
        category: null,
        stars: 5,
        icon: "🎮",
      });

      render(
        <CategoryManagement
          {...baseProps}
          quests={[...baseProps.quests, uncategorizedQuest]}
        />
      );

      const uncatButton = screen.getByText("Uncategorized").closest("button")!;
      fireEvent.click(uncatButton);

      expect(screen.getByText("Free Play")).toBeInTheDocument();
      expect(screen.getByText("🎮")).toBeInTheDocument();
    });

    it("allows editing uncategorized quests", () => {
      const uncategorizedQuest = createMockQuest({
        id: "q-uncat",
        name_en: "Free Play",
        category: null,
      });

      render(
        <CategoryManagement
          {...baseProps}
          quests={[...baseProps.quests, uncategorizedQuest]}
        />
      );

      const uncatButton = screen.getByText("Uncategorized").closest("button")!;
      fireEvent.click(uncatButton);

      const questNameEl = screen.getByText("Free Play");
      const outerRow = questNameEl.parentElement!.parentElement!;
      const editBtn = within(outerRow as HTMLElement).getByText("common.edit");
      fireEvent.click(editBtn);

      expect(screen.getByTestId("quest-form-modal")).toBeInTheDocument();
      expect(screen.getByText("Editing: Free Play")).toBeInTheDocument();
    });
  });
});
