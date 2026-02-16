/**
 * QuickRecordForm Component Tests
 * Tests the parent quick record form with type-based grouping
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import QuickRecordForm from "@/components/admin/QuickRecordForm";
import type { Database } from "@/types/database";

type Quest = Database["public"]["Tables"]["quests"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

// Mock translations
const messages = {
  common: {
    stars: "Stars",
  },
  admin: {
    selectChild: "Select a child",
    orCustom: "Or enter a custom good deed",
    recordNote: "Note (optional)",
    recordStars: "Record Stars",
    recordSuccess: "Stars recorded successfully!",
    processing: "Processing...",
    recordDate: "Record Date",
    adjustMultiplier: "Adjust Multiplier / Severity",
    multiplierLabel: "Multiplier:",
    multiplierExample: "Example: 10 mins over = 1\u00d7, 20 mins over = 2\u00d7, etc.",
    actualStars: "Actual Stars:",
    selectChildFirst: "Please select a child first",
    selectQuestOrCustom: "Please select a quest or enter custom description",
  },
};

const mockChildren: User[] = [
  {
    id: "child1",
    family_id: "fam1",
    parent_id: "parent1",
    username: "alice",
    name: "Alice",
    display_name_en: "Alice",
    display_name_zh: "爱丽丝",
    role: "child",
    locale: "en",
    star_balance: 100,
    level_id: "level1",
    avatar_url: null,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "child2",
    family_id: "fam1",
    parent_id: "parent1",
    username: "bob",
    name: "Bob",
    display_name_en: "Bob",
    display_name_zh: "鲍勃",
    role: "child",
    locale: "zh-CN",
    star_balance: 50,
    level_id: "level1",
    avatar_url: null,
    created_at: "2025-01-01T00:00:00Z",
  },
];

const mockQuests: Quest[] = [
  // Bonus quests
  {
    id: "1",
    family_id: "fam1",
    name_en: "Help wash dishes",
    name_zh: "帮忙洗碗",
    stars: 15,
    type: "bonus",
    scope: "family",
    category: "chores",
    icon: "🍳",
    is_positive: true,
    is_active: true,
    max_per_day: 2,
    sort_order: 1,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    family_id: "fam1",
    name_en: "Extra reading",
    name_zh: "额外阅读",
    stars: 15,
    type: "bonus",
    scope: "self",
    category: "learning",
    icon: "📖",
    is_positive: true,
    is_active: true,
    max_per_day: 2,
    sort_order: 2,
    created_at: "2025-01-01T00:00:00Z",
  },
  // Duty quests
  {
    id: "3",
    family_id: "fam1",
    name_en: "Brush teeth",
    name_zh: "刷牙",
    stars: -5,
    type: "duty",
    scope: "self",
    category: "hygiene",
    icon: "🪥",
    is_positive: false,
    is_active: true,
    max_per_day: 2,
    sort_order: 3,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "4",
    family_id: "fam1",
    name_en: "Finish homework",
    name_zh: "完成作业",
    stars: -15,
    type: "duty",
    scope: "self",
    category: "learning",
    icon: "📝",
    is_positive: false,
    is_active: true,
    max_per_day: 1,
    sort_order: 4,
    created_at: "2025-01-01T00:00:00Z",
  },
  // Violation quests
  {
    id: "5",
    family_id: "fam1",
    name_en: "Lying",
    name_zh: "说谎",
    stars: -30,
    type: "violation",
    scope: "self",
    category: "social",
    icon: "🤥",
    is_positive: false,
    is_active: true,
    max_per_day: 99,
    sort_order: 5,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "6",
    family_id: "fam1",
    name_en: "Fighting",
    name_zh: "打架",
    stars: -40,
    type: "violation",
    scope: "other",
    category: "social",
    icon: "🤛",
    is_positive: false,
    is_active: true,
    max_per_day: 99,
    sort_order: 6,
    created_at: "2025-01-01T00:00:00Z",
  },
];

const zhMessages = {
  common: {
    stars: "星星",
  },
  admin: {
    selectChild: "选择孩子",
    orCustom: "或输入自定义描述",
    recordNote: "给孩子的备注（可选）",
    recordStars: "记录星星",
    recordSuccess: "记录成功！",
    processing: "处理中...",
    recordDate: "记录日期",
    adjustMultiplier: "调整倍数 / 程度",
    multiplierLabel: "倍数:",
    multiplierExample: "例如：超过10分钟 = 1×，超过20分钟 = 2×，以此类推",
    actualStars: "实际星星:",
    selectChildFirst: "请先选择一个孩子",
    selectQuestOrCustom: "请选择一个任务或输入自定义描述",
  },
};

// Mock router
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: mockRefresh,
  }),
}));

// Mock Supabase client
const mockFrom = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock typedInsert from supabase helpers
const mockTypedInsert = jest.fn();
jest.mock("@/lib/supabase/helpers", () => ({
  typedInsert: (...args: any[]) => mockTypedInsert(...args),
}));

describe("QuickRecordForm Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: typedInsert resolves with no error
    mockTypedInsert.mockResolvedValue({ error: null });
  });

  const renderComponent = (
    quests: Quest[] = mockQuests,
    children: User[] = mockChildren,
    locale = "en"
  ) => {
    const msgs = locale === "zh-CN" ? zhMessages : messages;
    return render(
      <NextIntlClientProvider messages={msgs} locale={locale}>
        <QuickRecordForm
          quests={quests}
          familyChildren={children}
          locale={locale}
          parentId="parent1"
          familyId="fam1"
        />
      </NextIntlClientProvider>
    );
  };

  describe("Quest grouping by type", () => {
    it("should display three quest type sections", () => {
      renderComponent();

      // Check for all three group headers (exact text from component)
      expect(screen.getByText(/Did Good.*Bonus/)).toBeInTheDocument();
      expect(screen.getByText(/Missed Duty/)).toBeInTheDocument();
      expect(screen.getByText(/Violation/)).toBeInTheDocument();
    });

    it("should group quests correctly by type", () => {
      renderComponent();

      // Bonus section should have 2 quests
      expect(screen.getByText("Help wash dishes")).toBeInTheDocument();
      expect(screen.getByText("Extra reading")).toBeInTheDocument();

      // Duty section should have 2 quests
      expect(screen.getByText("Brush teeth")).toBeInTheDocument();
      expect(screen.getByText("Finish homework")).toBeInTheDocument();

      // Violation section should have 2 quests
      expect(screen.getByText("Lying")).toBeInTheDocument();
      expect(screen.getByText("Fighting")).toBeInTheDocument();
    });

    it("should display group icons", () => {
      const { container } = renderComponent();

      const content = container.textContent;
      expect(content).toContain("⭐"); // Bonus icon
      expect(content).toContain("📋"); // Duty icon
      expect(content).toContain("⚠️"); // Violation icon
    });

    it("should not display empty groups", () => {
      // Only bonus quests
      const bonusOnly = mockQuests.filter((q) => q.type === "bonus");
      renderComponent(bonusOnly);

      // Should show bonus group
      expect(screen.getByText(/Did Good/)).toBeInTheDocument();

      // Should NOT show duty and violation groups
      expect(screen.queryByText(/Missed Duty/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Violation/)).not.toBeInTheDocument();
    });
  });

  describe("Quest display", () => {
    it("should display quest icons", () => {
      renderComponent();

      const { container } = renderComponent();
      const content = container.textContent;
      expect(content).toContain("🍳"); // Bonus quest icon
      expect(content).toContain("🪥"); // Duty quest icon
      expect(content).toContain("🤥"); // Violation quest icon
    });

    it("should display quest stars with correct sign", () => {
      const { container } = renderComponent();
      const content = container.textContent;

      // Bonus quests show positive stars
      expect(content).toContain("+15");

      // Duty quests show negative stars
      expect(content).toContain("-5");
      expect(content).toContain("-15");

      // Violation quests show negative stars
      expect(content).toContain("-30");
      expect(content).toContain("-40");
    });
  });

  describe("Child selection", () => {
    it("should display all children", () => {
      renderComponent();

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("should allow selecting a child", () => {
      renderComponent();

      // Find the clickable card (parent of the name)
      const aliceText = screen.getByText("Alice");
      const aliceCard = aliceText.closest("div[class*='border']");
      expect(aliceCard).toBeTruthy();

      if (aliceCard) {
        fireEvent.click(aliceCard);
        // After click, should have secondary border
        expect(aliceCard.className).toContain("border-secondary");
      }
    });
  });

  describe("Quest selection", () => {
    it("should allow selecting a quest", () => {
      renderComponent();

      // Find the clickable card (parent with border classes)
      const questText = screen.getByText("Help wash dishes");
      const questCard = questText.closest("div[class*='border']");
      expect(questCard).toBeTruthy();

      if (questCard) {
        fireEvent.click(questCard);
        // Should highlight selected quest with success border
        expect(questCard.className).toContain("border-success");
      }
    });

    it("should clear custom description when selecting a quest", () => {
      renderComponent();

      // Enter custom description
      const customInput = screen.getByPlaceholderText(
        /Helped neighbor carry groceries/i
      );
      fireEvent.change(customInput, {
        target: { value: "Helped neighbor" },
      });
      expect(customInput).toHaveValue("Helped neighbor");

      // Click a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Custom description should be cleared
      expect(customInput).toHaveValue("");
    });
  });

  describe("Custom quest", () => {
    it("should allow entering custom quest description", () => {
      renderComponent();

      const customInput = screen.getByPlaceholderText(
        /Helped neighbor carry groceries/i
      );
      fireEvent.change(customInput, {
        target: { value: "Helped neighbor carry groceries" },
      });

      expect(customInput).toHaveValue("Helped neighbor carry groceries");
    });

    it("should show stars input when custom description entered", () => {
      renderComponent();

      const customInput = screen.getByPlaceholderText(
        /Helped neighbor carry groceries/i
      );
      fireEvent.change(customInput, {
        target: { value: "Helped neighbor" },
      });

      // Should show stars input
      const starsInput = screen.getByPlaceholderText("Stars");
      expect(starsInput).toBeInTheDocument();
    });
  });

  describe("Parent note", () => {
    it("should allow entering parent note", () => {
      renderComponent();

      const noteTextarea = screen.getByPlaceholderText(/Great job today!/i);
      fireEvent.change(noteTextarea, {
        target: { value: "Well done!" },
      });

      expect(noteTextarea).toHaveValue("Well done!");
    });
  });

  describe("Locale support", () => {
    it("should display Chinese quest names when locale is zh-CN", () => {
      renderComponent(mockQuests, mockChildren, "zh-CN");

      expect(screen.getByText("帮忙洗碗")).toBeInTheDocument();
      expect(screen.getByText("额外阅读")).toBeInTheDocument();
      expect(screen.getByText("刷牙")).toBeInTheDocument();
      expect(screen.getByText("说谎")).toBeInTheDocument();
    });

    it("should display English quest names when locale is en", () => {
      renderComponent(mockQuests, mockChildren, "en");

      expect(screen.getByText("Help wash dishes")).toBeInTheDocument();
      expect(screen.getByText("Extra reading")).toBeInTheDocument();
      expect(screen.getByText("Brush teeth")).toBeInTheDocument();
      expect(screen.getByText("Lying")).toBeInTheDocument();
    });
  });

  describe("Empty states", () => {
    it("should show message when no children available", () => {
      renderComponent(mockQuests, []);

      expect(
        screen.getByText(/No children in your family yet/i)
      ).toBeInTheDocument();
    });
  });

  describe("Form validation", () => {
    it("should disable submit button when no child selected", () => {
      renderComponent();

      const submitButton = screen.getByRole("button", { name: /record/i });
      expect(submitButton).toBeDisabled();
    });

    it("should disable submit button when child selected but no quest or custom description", () => {
      renderComponent();

      // Select child
      const aliceCard = screen.getByText("Alice").closest("div");
      if (aliceCard) {
        fireEvent.click(aliceCard);
      }

      // Submit button should still be disabled
      const submitButton = screen.getByRole("button", { name: /record/i });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when child and quest selected", () => {
      renderComponent();

      // Select child
      const aliceCard = screen.getByText("Alice").closest("div");
      if (aliceCard) {
        fireEvent.click(aliceCard);
      }

      // Select quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Submit button should be enabled
      const submitButton = screen.getByRole("button", { name: /record/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Multiplier functionality", () => {
    it("should not show multiplier section when no quest is selected", () => {
      renderComponent();

      // Multiplier section should not be visible
      expect(screen.queryByText("admin.adjustMultiplier")).not.toBeInTheDocument();
    });

    it("should show multiplier section when a quest is selected", () => {
      renderComponent();

      // Select a bonus quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Multiplier section should be visible
      expect(screen.getByText("admin.adjustMultiplier")).toBeInTheDocument();
    });

    it("should display default multiplier value of 1", () => {
      renderComponent();

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Find multiplier input
      const multiplierInput = screen.getByDisplayValue("1");
      expect(multiplierInput).toBeInTheDocument();
      expect(multiplierInput).toHaveAttribute("type", "number");
      expect(multiplierInput).toHaveAttribute("min", "1");
      expect(multiplierInput).toHaveAttribute("max", "10");
    });

    it("should allow changing multiplier value", () => {
      renderComponent();

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Find and change multiplier input
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "3" } });

      expect(multiplierInput).toHaveValue(3);
    });

    it("should calculate and display correct stars with multiplier for bonus quest", () => {
      renderComponent();

      // Select a bonus quest (+15 stars)
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Check base stars display - there will be multiple "+15" elements
      const allPlusFifteen = screen.getAllByText("+15");
      expect(allPlusFifteen.length).toBeGreaterThan(0);

      // Change multiplier to 3
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "3" } });

      // Should show calculated stars (15 × 3 = 45)
      expect(screen.getByText("+45")).toBeInTheDocument();
      expect(screen.getByText("15 × 3")).toBeInTheDocument();
    });

    it("should calculate and display correct stars with multiplier for duty quest", () => {
      renderComponent();

      // Select a duty quest (-5 stars)
      const questCard = screen.getByText("Brush teeth").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Change multiplier to 2
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "2" } });

      // Should show calculated stars (-5 × 2 = -10)
      expect(screen.getByText("-10")).toBeInTheDocument();
      expect(screen.getByText("-5 × 2")).toBeInTheDocument();
    });

    it("should calculate and display correct stars with multiplier for violation quest", () => {
      renderComponent();

      // Select a violation quest (-30 stars)
      const questCard = screen.getByText("Lying").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Change multiplier to 4
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "4" } });

      // Should show calculated stars (-30 × 4 = -120)
      expect(screen.getByText("-120")).toBeInTheDocument();
      expect(screen.getByText("-30 × 4")).toBeInTheDocument();
    });

    it("should reset multiplier to 1 when changing quest selection", () => {
      renderComponent();

      // Select first quest
      const quest1Card = screen.getByText("Help wash dishes").closest("div");
      if (quest1Card) {
        fireEvent.click(quest1Card);
      }

      // Change multiplier
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "5" } });
      expect(multiplierInput).toHaveValue(5);

      // Select a different quest
      const quest2Card = screen.getByText("Extra reading").closest("div");
      if (quest2Card) {
        fireEvent.click(quest2Card);
      }

      // Multiplier should reset to 1
      const resetMultiplierInput = screen.getByDisplayValue("1");
      expect(resetMultiplierInput).toHaveValue(1);
    });

    it("should enforce minimum multiplier value of 1", () => {
      renderComponent();

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Try to set multiplier below 1
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "0" } });

      // Should enforce minimum of 1
      expect(multiplierInput).toHaveValue(1);

      // Try negative value
      fireEvent.change(multiplierInput, { target: { value: "-5" } });
      expect(multiplierInput).toHaveValue(1);
    });

    it("should display helpful example text via i18n key", () => {
      renderComponent(mockQuests, mockChildren, "en");

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Should show example text via translation key
      expect(screen.getByText(/admin\.multiplierExample/)).toBeInTheDocument();
    });

    it("should show multiplier range (1-10×)", () => {
      renderComponent();

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Should show range indicator
      expect(screen.getByText("(1-10×)")).toBeInTheDocument();
    });

    it("should display actual stars label via i18n key", () => {
      renderComponent(mockQuests, mockChildren, "en");

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      expect(screen.getByText("admin.actualStars")).toBeInTheDocument();
    });

    it("should handle multiplier with maximum value of 10", () => {
      renderComponent();

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Set multiplier to 10
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "10" } });

      expect(multiplierInput).toHaveValue(10);

      // Should show calculated stars (15 × 10 = 150)
      expect(screen.getByText("+150")).toBeInTheDocument();
    });

    it("should handle large negative stars with multiplier", () => {
      renderComponent();

      // Select fighting quest (-40 stars)
      const questCard = screen.getByText("Fighting").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Set multiplier to 5
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "5" } });

      // Should show calculated stars (-40 × 5 = -200)
      expect(screen.getByText("-200")).toBeInTheDocument();
    });

    it("should hide multiplier section when switching to custom description", () => {
      renderComponent();

      // Select a quest (multiplier should appear)
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      expect(screen.getByText("admin.adjustMultiplier")).toBeInTheDocument();

      // Enter custom description
      const customInput = screen.getByPlaceholderText(
        /Helped neighbor carry groceries/i
      );
      fireEvent.change(customInput, {
        target: { value: "Custom activity" },
      });

      // Multiplier section should be hidden
      expect(screen.queryByText("admin.adjustMultiplier")).not.toBeInTheDocument();
    });

    it("should apply multiplier correctly in star calculation for duty quest", () => {
      renderComponent();

      // Select finish homework quest (-15 stars)
      const questCard = screen.getByText("Finish homework").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Set multiplier to 3
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "3" } });

      // Should show -45 stars
      expect(screen.getByText("-45")).toBeInTheDocument();
      expect(screen.getByText("-15 × 3")).toBeInTheDocument();
    });
  });

  describe("Auto-select child", () => {
    it("should auto-select child when only one child exists", () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // The single child card should be automatically selected (border-secondary)
      const aliceCard = screen.getByText("Alice").closest("div[class*='border']");
      expect(aliceCard).toBeTruthy();
      expect(aliceCard!.className).toContain("border-secondary");
    });

    it("should not auto-select when multiple children exist", () => {
      renderComponent(mockQuests, mockChildren);

      // Neither child should be auto-selected
      const aliceCard = screen.getByText("Alice").closest("div[class*='border']");
      const bobCard = screen.getByText("Bob").closest("div[class*='border']");

      expect(aliceCard!.className).not.toContain("border-secondary");
      expect(bobCard!.className).not.toContain("border-secondary");
    });
  });

  describe("Form submission - validation errors", () => {
    it("should show error when submitting without selecting a child", async () => {
      renderComponent();

      // Select a child then a quest to enable the button, then deselect the child
      // Actually, the button is disabled when no child is selected.
      // We need to force submit via form submission. Let's select child+quest, then test
      // with a workaround: render with single child (auto-select), select quest, submit.
      // Actually, let's test validation by selecting child, quest, then switching to
      // a different scenario. The button is disabled when no child, so we can't click it.
      // BUT: The handleSubmit still validates. Let's test it by:
      // 1. Render with single child (auto-selected)
      // 2. Select a quest
      // 3. The button is enabled
      // 4. Then we can submit

      // For the "no child selected" error, we need to bypass the disabled attribute.
      // Actually, looking at the code more carefully - the button is disabled when
      // !selectedChild, so the user can't click it. The validation in handleSubmit is
      // defense-in-depth. We can test it by submitting the form directly.
      const { container } = renderComponent();

      // Submit the form directly (bypassing disabled button)
      const form = container.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Please select a child")).toBeInTheDocument();
      });
    });

    it("should show error when submitting without quest or custom description", async () => {
      const singleChild = [mockChildren[0]];
      const { container } = renderComponent(mockQuests, singleChild);

      // Child is auto-selected. Submit without selecting quest or entering custom description.
      const form = container.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("Please select a quest or enter a custom description")
        ).toBeInTheDocument();
      });
    });

    it("should show error when custom description has 0 stars", async () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Enter custom description (no quest selected, so isCustom = true)
      const customInput = screen.getByPlaceholderText(
        /Helped neighbor carry groceries/i
      );
      fireEvent.change(customInput, {
        target: { value: "Helped with groceries" },
      });

      // Custom stars defaults to 0, so submit should show error
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Please enter the number of stars")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form submission - success", () => {
    it("should submit successfully with selected quest and show success message", async () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a bonus quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      // Verify success message appears
      await waitFor(() => {
        expect(screen.getByText("admin.recordSuccess")).toBeInTheDocument();
      });

      // Verify typedInsert was called with correct args
      expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      const callArgs = mockTypedInsert.mock.calls[0];
      // First arg is supabase client, second is table name, third is data
      expect(callArgs[1]).toBe("star_transactions");
      expect(callArgs[2]).toMatchObject({
        family_id: "fam1",
        child_id: "child1",
        quest_id: "1",
        stars: 15, // 15 * 1 (default multiplier)
        source: "parent_record",
        status: "approved",
        created_by: "parent1",
        reviewed_by: "parent1",
      });
    });

    it("should submit with multiplied stars", async () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a bonus quest (+15 stars)
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Change multiplier to 3
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "3" } });

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      });

      // Stars should be 15 * 3 = 45
      const callArgs = mockTypedInsert.mock.calls[0];
      expect(callArgs[2].stars).toBe(45);
    });

    it("should reset form after successful submission", async () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Enter a parent note
      const noteTextarea = screen.getByPlaceholderText(/Great job today!/i);
      fireEvent.change(noteTextarea, { target: { value: "Good job!" } });

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("admin.recordSuccess")).toBeInTheDocument();
      });

      // Verify form is reset: parent note cleared
      expect(noteTextarea).toHaveValue("");

      // Multiplier section should be hidden (no quest selected after reset)
      expect(screen.queryByText("admin.adjustMultiplier")).not.toBeInTheDocument();
    });

    it("should call router.refresh() after successful submission", async () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("should submit with custom description and custom stars", async () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Enter custom description
      const customInput = screen.getByPlaceholderText(
        /Helped neighbor carry groceries/i
      );
      fireEvent.change(customInput, {
        target: { value: "Helped neighbor move furniture" },
      });

      // Enter custom stars
      const starsInput = screen.getByPlaceholderText("Stars");
      fireEvent.change(starsInput, { target: { value: "10" } });

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockTypedInsert.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        family_id: "fam1",
        child_id: "child1",
        quest_id: null,
        custom_description: "Helped neighbor move furniture",
        stars: 10, // custom stars * default multiplier 1
        source: "parent_record",
        status: "approved",
      });
    });
  });

  describe("Form submission - error handling", () => {
    it("should display error message when insert fails", async () => {
      // Supabase errors are plain objects, not Error instances.
      // The component throws the error object, and in the catch:
      // err instanceof Error is false, so it shows "Failed to record stars"
      mockTypedInsert.mockResolvedValue({
        error: { message: "Database connection failed" },
      });

      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to record stars")
        ).toBeInTheDocument();
      });
    });

    it("should display Error.message when insert throws an Error instance", async () => {
      mockTypedInsert.mockRejectedValue(new Error("Network timeout"));

      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Network timeout")).toBeInTheDocument();
      });
    });

    it("should display generic error message when insert throws non-Error", async () => {
      mockTypedInsert.mockRejectedValue("something went wrong");

      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to record stars")
        ).toBeInTheDocument();
      });
    });

    it("should show loading state during submission", async () => {
      // Create a promise that we can control
      let resolveInsert!: (value: any) => void;
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve;
      });
      mockTypedInsert.mockReturnValue(insertPromise);

      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      // Should show processing text while loading
      await waitFor(() => {
        expect(screen.getByText("admin.processing")).toBeInTheDocument();
      });

      // Resolve the insert
      resolveInsert({ error: null });

      // Should go back to normal
      await waitFor(() => {
        expect(screen.getByText("admin.recordStars")).toBeInTheDocument();
      });
    });
  });

  describe("Record date", () => {
    it("should render the date input with required attribute", () => {
      const { container } = renderComponent();

      const dateInput = container.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute("required");
    });

    it("should allow changing the record date", () => {
      const { container } = renderComponent();

      const dateInput = container.querySelector('input[type="date"]')!;
      fireEvent.change(dateInput, { target: { value: "2026-01-15" } });
      expect(dateInput).toHaveValue("2026-01-15");
    });
  });

  describe("Inline validation hints", () => {
    it("should show 'select a child first' hint when no child selected with multiple children", () => {
      renderComponent(mockQuests, mockChildren);

      // With multiple children, none selected by default
      expect(
        screen.getByText(/admin\.selectChildFirst/)
      ).toBeInTheDocument();
    });

    it("should show 'select a quest' hint when child selected but no quest", () => {
      renderComponent(mockQuests, mockChildren);

      // Select a child
      const aliceCard = screen.getByText("Alice").closest("div");
      fireEvent.click(aliceCard!);

      // Should show quest hint
      expect(
        screen.getByText(/admin\.selectQuestOrCustom/)
      ).toBeInTheDocument();
    });

    it("should not show 'select child first' hint when child is auto-selected", () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // With single child auto-selected, should NOT show child hint
      expect(
        screen.queryByText(/admin\.selectChildFirst/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Child locale display", () => {
    it("should show 'Same language' when child locale matches component locale", () => {
      // Alice has locale "en", rendering with locale "en"
      renderComponent(mockQuests, mockChildren, "en");

      expect(screen.getByText("Same language")).toBeInTheDocument();
    });

    it("should show child locale when different from component locale", () => {
      // Bob has locale "zh-CN", rendering with locale "en"
      renderComponent(mockQuests, mockChildren, "en");

      expect(screen.getByText("zh-CN")).toBeInTheDocument();
    });
  });

  describe("Record date label", () => {
    it("should display the record date label with asterisk", () => {
      renderComponent();

      // The translation mock returns the key, and the component appends " *"
      expect(screen.getByText(/admin\.recordDate/)).toBeInTheDocument();
    });
  });

  describe("No warnings after successful save", () => {
    it("should not show warning messages after successful submission", async () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Submit
      const submitButton = screen.getByRole("button", { name: /record/i });
      fireEvent.click(submitButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText("admin.recordSuccess")).toBeInTheDocument();
      });

      // After reset, warnings should NOT appear alongside the success message
      expect(
        screen.queryByText(/admin\.selectChildFirst/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/admin\.selectQuestOrCustom/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Branch coverage - icon fallbacks", () => {
    it("should show ⭐ fallback icon for bonus quest with null icon", () => {
      const bonusQuestNoIcon: Quest[] = [
        {
          id: "bonus-no-icon",
          family_id: "fam1",
          name_en: "Bonus No Icon",
          name_zh: null,
          stars: 10,
          type: "bonus",
          scope: "self",
          category: "learning",
          icon: null,
          is_positive: true,
          is_active: true,
          max_per_day: 1,
          sort_order: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { container } = renderComponent(bonusQuestNoIcon);

      // The quest card should display the ⭐ fallback icon
      // The bonus section header also uses ⭐, so look for the one inside the quest card
      const questCard = screen.getByText("Bonus No Icon").closest("div[class*='border']");
      expect(questCard).toBeTruthy();
      expect(questCard!.textContent).toContain("⭐");
    });

    it("should show 📋 fallback icon for duty quest with null icon", () => {
      const dutyQuestNoIcon: Quest[] = [
        {
          id: "duty-no-icon",
          family_id: "fam1",
          name_en: "Duty No Icon",
          name_zh: null,
          stars: -5,
          type: "duty",
          scope: "self",
          category: "chores",
          icon: null,
          is_positive: false,
          is_active: true,
          max_per_day: 1,
          sort_order: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { container } = renderComponent(dutyQuestNoIcon);

      // The quest card should display the 📋 fallback icon
      const questCard = screen.getByText("Duty No Icon").closest("div[class*='border']");
      expect(questCard).toBeTruthy();
      // The section header and the quest card both have 📋
      const allClipboardIcons = container.querySelectorAll(".text-2xl");
      const questIconSpan = Array.from(allClipboardIcons).find(
        (el) => el.textContent === "📋"
      );
      expect(questIconSpan).toBeTruthy();
    });

    it("should show ⚠️ fallback icon for violation quest with null icon", () => {
      const violationQuestNoIcon: Quest[] = [
        {
          id: "violation-no-icon",
          family_id: "fam1",
          name_en: "Violation No Icon",
          name_zh: null,
          stars: -20,
          type: "violation",
          scope: "self",
          category: "social",
          icon: null,
          is_positive: false,
          is_active: true,
          max_per_day: 99,
          sort_order: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { container } = renderComponent(violationQuestNoIcon);

      // The quest card should display the ⚠️ fallback icon
      const questCard = screen.getByText("Violation No Icon").closest("div[class*='border']");
      expect(questCard).toBeTruthy();
      const allIcons = container.querySelectorAll(".text-2xl");
      const questIconSpan = Array.from(allIcons).find(
        (el) => el.textContent === "⚠️"
      );
      expect(questIconSpan).toBeTruthy();
    });
  });

  describe("Branch coverage - negative stars color", () => {
    it("should display text-danger class for negative stars in multiplier section", () => {
      const { container } = renderComponent();

      // Select a duty quest with negative stars (-5)
      const questCard = screen.getByText("Brush teeth").closest("div");
      fireEvent.click(questCard!);

      // The multiplier section has a div with class "text-3xl font-bold" and either text-success or text-danger
      // For negative stars, it should have text-danger
      const multiplierStarsEl = container.querySelector(
        ".text-3xl.font-bold.text-danger"
      );
      expect(multiplierStarsEl).toBeTruthy();
      expect(multiplierStarsEl!.textContent).toContain("-5");
    });

    it("should display text-success class for positive stars in multiplier section", () => {
      const { container } = renderComponent();

      // Select a bonus quest with positive stars (+15)
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // For positive stars, it should have text-success
      const multiplierStarsEl = container.querySelector(
        ".text-3xl.font-bold.text-success"
      );
      expect(multiplierStarsEl).toBeTruthy();
      expect(multiplierStarsEl!.textContent).toContain("+15");
    });
  });

  describe("Branch coverage - parseInt fallbacks", () => {
    it("should default custom stars to 0 for non-numeric input", () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      // Enter custom description to show stars input
      const customInput = screen.getByPlaceholderText(
        /Helped neighbor carry groceries/i
      );
      fireEvent.change(customInput, {
        target: { value: "Some custom task" },
      });

      // Enter non-numeric value in custom stars input
      const starsInput = screen.getByPlaceholderText("Stars");
      fireEvent.change(starsInput, { target: { value: "abc" } });

      // The value should default to 0 via parseInt("abc") || 0
      // The input shows empty string for 0 (because of `customStars || ""`)
      expect(starsInput).toHaveValue(null);
    });

    it("should default multiplier to 1 for non-numeric input", () => {
      renderComponent();

      // Select a quest to show multiplier
      const questCard = screen.getByText("Help wash dishes").closest("div");
      fireEvent.click(questCard!);

      // Find multiplier input
      const multiplierInput = screen.getByDisplayValue("1");

      // Enter non-numeric value
      fireEvent.change(multiplierInput, { target: { value: "abc" } });

      // The multiplier should default to 1 via Math.max(1, parseInt("abc") || 1)
      expect(multiplierInput).toHaveValue(1);
    });
  });

  describe("Branch coverage - form validation on submit", () => {
    it("should show error when child selected but no quest selected on form submit", async () => {
      const singleChild = [mockChildren[0]];
      const { container } = renderComponent(mockQuests, singleChild);

      // Child is auto-selected, but no quest is selected and no custom description.
      // The submit button is disabled, so submit the form directly to test validation.
      const form = container.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("Please select a quest or enter a custom description")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Branch coverage - empty children", () => {
    it("should show warning when children array is empty", () => {
      renderComponent(mockQuests, []);

      expect(
        screen.getByText(/No children in your family yet/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Add a child in Family Management/i)
      ).toBeInTheDocument();
    });
  });

  describe("Branch coverage - auto-select and locale", () => {
    it("should auto-select when only one child is provided", () => {
      const singleChild = [mockChildren[0]];
      renderComponent(mockQuests, singleChild);

      const aliceCard = screen
        .getByText("Alice")
        .closest("div[class*='border']");
      expect(aliceCard!.className).toContain("border-secondary");
    });

    it("should display matching locale as 'Same language' for child with same locale", () => {
      // Alice has locale "en", rendering with "en"
      renderComponent(mockQuests, mockChildren, "en");

      expect(screen.getByText("Same language")).toBeInTheDocument();
    });
  });
});
