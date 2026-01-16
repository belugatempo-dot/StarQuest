/**
 * QuickRecordForm Component Tests
 * Tests the parent quick record form with type-based grouping
 */

import { render, screen, fireEvent } from "@testing-library/react";
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

// Mock router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
    }),
  }),
}));

describe("QuickRecordForm Component", () => {
  const renderComponent = (
    quests: Quest[] = mockQuests,
    children: User[] = mockChildren,
    locale = "en"
  ) => {
    return render(
      <NextIntlClientProvider messages={messages} locale={locale}>
        <QuickRecordForm
          quests={quests}
          children={children}
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
      expect(screen.queryByText(/Adjust Multiplier/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/调整倍数/)).not.toBeInTheDocument();
    });

    it("should show multiplier section when a quest is selected", () => {
      renderComponent();

      // Select a bonus quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Multiplier section should be visible
      expect(screen.getByText(/Adjust Multiplier/i)).toBeInTheDocument();
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

    it("should display helpful example text in English", () => {
      renderComponent(mockQuests, mockChildren, "en");

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Should show example text
      expect(screen.getByText(/10 mins over = 1×, 20 mins over = 2×/i)).toBeInTheDocument();
    });

    it("should display helpful example text in Chinese", () => {
      renderComponent(mockQuests, mockChildren, "zh-CN");

      // Select a quest
      const questCard = screen.getByText("帮忙洗碗").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      // Should show Chinese example text
      expect(screen.getByText(/超过10分钟 = 1×，超过20分钟 = 2×/)).toBeInTheDocument();
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

    it("should display actual stars label in English", () => {
      renderComponent(mockQuests, mockChildren, "en");

      // Select a quest
      const questCard = screen.getByText("Help wash dishes").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      expect(screen.getByText("Actual Stars:")).toBeInTheDocument();
    });

    it("should display actual stars label in Chinese", () => {
      renderComponent(mockQuests, mockChildren, "zh-CN");

      // Select a quest
      const questCard = screen.getByText("帮忙洗碗").closest("div");
      if (questCard) {
        fireEvent.click(questCard);
      }

      expect(screen.getByText("实际星星:")).toBeInTheDocument();
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

      expect(screen.getByText(/Adjust Multiplier/i)).toBeInTheDocument();

      // Enter custom description
      const customInput = screen.getByPlaceholderText(
        /Helped neighbor carry groceries/i
      );
      fireEvent.change(customInput, {
        target: { value: "Custom activity" },
      });

      // Multiplier section should be hidden
      expect(screen.queryByText(/Adjust Multiplier/i)).not.toBeInTheDocument();
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
});
