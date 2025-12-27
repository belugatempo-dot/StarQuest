import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionList from "@/components/child/TransactionList";
import type { Database } from "@/types/database";

type Transaction = Database["public"]["Tables"]["star_transactions"]["Row"] & {
  quests: {
    name_en: string;
    name_zh: string | null;
    icon: string | null;
    category: string | null;
  } | null;
};

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("TransactionList", () => {
  const mockTransactions: Transaction[] = [
    {
      id: "tx-1",
      family_id: "family-123",
      child_id: "child-123",
      quest_id: "quest-1",
      stars: 10,
      source: "child_request",
      status: "approved",
      child_note: "I completed this task before dinner",
      parent_response: null,
      created_at: "2025-01-15T10:30:00Z",
      updated_at: "2025-01-15T10:30:00Z",
      created_by: "child-123",
      custom_description: null,
      quests: {
        name_en: "Clean bedroom",
        name_zh: "打扫房间",
        icon: "🧹",
        category: "chores",
      },
    },
    {
      id: "tx-2",
      family_id: "family-123",
      child_id: "child-123",
      quest_id: "quest-2",
      stars: -5,
      source: "parent_record",
      status: "approved",
      child_note: null,
      parent_response: null,
      created_at: "2025-01-14T09:00:00Z",
      updated_at: "2025-01-14T09:00:00Z",
      created_by: "parent-123",
      custom_description: null,
      quests: {
        name_en: "Left toys on floor",
        name_zh: "玩具散落地上",
        icon: "🧸",
        category: "violations",
      },
    },
    {
      id: "tx-3",
      family_id: "family-123",
      child_id: "child-123",
      quest_id: "quest-3",
      stars: 15,
      source: "child_request",
      status: "pending",
      child_note: "I helped mom with the dishes",
      parent_response: null,
      created_at: "2025-01-16T14:00:00Z",
      updated_at: "2025-01-16T14:00:00Z",
      created_by: "child-123",
      custom_description: null,
      quests: {
        name_en: "Help with dishes",
        name_zh: "帮忙洗碗",
        icon: "🍽️",
        category: "chores",
      },
    },
    {
      id: "tx-4",
      family_id: "family-123",
      child_id: "child-123",
      quest_id: "quest-4",
      stars: 20,
      source: "child_request",
      status: "rejected",
      child_note: "I practiced piano",
      parent_response: "You only practiced for 5 minutes, not the full 30 minutes required",
      created_at: "2025-01-13T16:00:00Z",
      updated_at: "2025-01-13T17:00:00Z",
      created_by: "child-123",
      custom_description: null,
      quests: {
        name_en: "Practice piano 30 mins",
        name_zh: "练琴30分钟",
        icon: "🎹",
        category: "music",
      },
    },
    {
      id: "tx-5",
      family_id: "family-123",
      child_id: "child-123",
      quest_id: null,
      stars: 25,
      source: "parent_record",
      status: "approved",
      child_note: null,
      parent_response: null,
      created_at: "2025-01-12T11:00:00Z",
      updated_at: "2025-01-12T11:00:00Z",
      created_by: "parent-123",
      custom_description: "Exceptional behavior at school",
      quests: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render filter tabs with counts", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByRole("button", { name: /history\.allTransactions/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /status\.approved/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /status\.pending/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /status\.rejected/ })).toBeInTheDocument();

      // Check counts
      expect(screen.getByText("(5)")).toBeInTheDocument(); // All
      expect(screen.getByText("(3)")).toBeInTheDocument(); // Approved
      const countOnes = screen.getAllByText("(1)");
      expect(countOnes.length).toBe(2); // Pending and Rejected each have 1
    });

    it("should display all transactions initially", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByText("Clean bedroom")).toBeInTheDocument();
      expect(screen.getByText("Left toys on floor")).toBeInTheDocument();
      expect(screen.getByText("Help with dishes")).toBeInTheDocument();
      expect(screen.getByText("Practice piano 30 mins")).toBeInTheDocument();
      expect(screen.getByText("Exceptional behavior at school")).toBeInTheDocument();
    });

    it("should display transaction icons", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByText("🧹")).toBeInTheDocument();
      expect(screen.getByText("🧸")).toBeInTheDocument();
      expect(screen.getByText("🍽️")).toBeInTheDocument();
      expect(screen.getByText("🎹")).toBeInTheDocument();
      expect(screen.getByText("⭐")).toBeInTheDocument(); // Default for custom transaction
    });

    it("should display star values with +/- signs", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByText("+10")).toBeInTheDocument();
      expect(screen.getByText("-5")).toBeInTheDocument();
      expect(screen.getByText("+15")).toBeInTheDocument();
      expect(screen.getByText("+20")).toBeInTheDocument();
      expect(screen.getByText("+25")).toBeInTheDocument();
    });

    it("should display status badges", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const statusBadges = screen.getAllByText("status.approved");
      expect(statusBadges.length).toBeGreaterThan(0);
      const pendingBadges = screen.getAllByText("status.pending");
      expect(pendingBadges.length).toBeGreaterThan(0);
      const rejectedBadges = screen.getAllByText("status.rejected");
      expect(rejectedBadges.length).toBeGreaterThan(0);
    });

    it("should display child notes when available", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByText(/"I completed this task before dinner"/)).toBeInTheDocument();
      expect(screen.getByText(/"I helped mom with the dishes"/)).toBeInTheDocument();
      expect(screen.getByText(/"I practiced piano"/)).toBeInTheDocument();
    });

    it("should display parent response for rejected transactions", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByText("history.rejectionReason:")).toBeInTheDocument();
      expect(
        screen.getByText("You only practiced for 5 minutes, not the full 30 minutes required")
      ).toBeInTheDocument();
    });

    it("should display pending indicator for pending transactions", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByText("⏳")).toBeInTheDocument();
      expect(screen.getByText("history.waitingApproval")).toBeInTheDocument();
    });

    it("should display source labels", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const parentRecorded = screen.getAllByText("history.parentRecorded");
      expect(parentRecorded.length).toBe(2); // tx-2 and tx-5

      const youRequested = screen.getAllByText("history.youRequested");
      expect(youRequested.length).toBe(3); // tx-1, tx-3, tx-4
    });

    it("should display custom description when quest is null", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByText("Exceptional behavior at school")).toBeInTheDocument();
    });

    it("should show empty state when no transactions", () => {
      render(<TransactionList transactions={[]} locale="en" />);

      expect(screen.getByText("📭")).toBeInTheDocument();
      expect(screen.getByText("history.emptyState")).toBeInTheDocument();
    });
  });

  describe("Bilingual Display", () => {
    it("should display quest names in English when locale is en", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      expect(screen.getByText("Clean bedroom")).toBeInTheDocument();
      expect(screen.getByText("Left toys on floor")).toBeInTheDocument();
      expect(screen.getByText("Help with dishes")).toBeInTheDocument();
    });

    it("should display quest names in Chinese when locale is zh-CN", () => {
      render(<TransactionList transactions={mockTransactions} locale="zh-CN" />);

      expect(screen.getByText("打扫房间")).toBeInTheDocument();
      expect(screen.getByText("玩具散落地上")).toBeInTheDocument();
      expect(screen.getByText("帮忙洗碗")).toBeInTheDocument();
    });

    it("should fallback to English name when Chinese name is null", () => {
      const txWithoutZh: Transaction[] = [
        {
          ...mockTransactions[0],
          quests: {
            name_en: "Some task",
            name_zh: null,
            icon: "⭐",
            category: "other",
          },
        },
      ];

      render(<TransactionList transactions={txWithoutZh} locale="zh-CN" />);

      expect(screen.getByText("Some task")).toBeInTheDocument();
    });
  });

  describe("Status Filtering", () => {
    it("should filter transactions by approved status", async () => {
      const user = userEvent.setup();
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const approvedButton = screen.getByRole("button", { name: /status\.approved/ });
      await user.click(approvedButton);

      expect(screen.getByText("Clean bedroom")).toBeInTheDocument();
      expect(screen.getByText("Left toys on floor")).toBeInTheDocument();
      expect(screen.getByText("Exceptional behavior at school")).toBeInTheDocument();
      expect(screen.queryByText("Help with dishes")).not.toBeInTheDocument();
      expect(screen.queryByText("Practice piano 30 mins")).not.toBeInTheDocument();
    });

    it("should filter transactions by pending status", async () => {
      const user = userEvent.setup();
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const pendingButton = screen.getByRole("button", { name: /status\.pending/ });
      await user.click(pendingButton);

      expect(screen.getByText("Help with dishes")).toBeInTheDocument();
      expect(screen.queryByText("Clean bedroom")).not.toBeInTheDocument();
      expect(screen.queryByText("Practice piano 30 mins")).not.toBeInTheDocument();
    });

    it("should filter transactions by rejected status", async () => {
      const user = userEvent.setup();
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const rejectedButton = screen.getByRole("button", { name: /status\.rejected/ });
      await user.click(rejectedButton);

      expect(screen.getByText("Practice piano 30 mins")).toBeInTheDocument();
      expect(screen.queryByText("Clean bedroom")).not.toBeInTheDocument();
      expect(screen.queryByText("Help with dishes")).not.toBeInTheDocument();
    });

    it("should show all transactions when all filter is selected", async () => {
      const user = userEvent.setup();
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      // First filter by approved
      const approvedButton = screen.getByRole("button", { name: /status\.approved/ });
      await user.click(approvedButton);

      expect(screen.queryByText("Help with dishes")).not.toBeInTheDocument();

      // Then select all
      const allButton = screen.getByRole("button", { name: /history\.allTransactions/ });
      await user.click(allButton);

      expect(screen.getByText("Clean bedroom")).toBeInTheDocument();
      expect(screen.getByText("Help with dishes")).toBeInTheDocument();
      expect(screen.getByText("Practice piano 30 mins")).toBeInTheDocument();
    });

    it("should highlight active filter button", async () => {
      const user = userEvent.setup();
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const pendingButton = screen.getByRole("button", { name: /status\.pending/ });
      await user.click(pendingButton);

      expect(pendingButton.className).toContain("bg-primary");
    });

    it("should show empty state when filtered status has no transactions", async () => {
      const user = userEvent.setup();
      const singleTransaction = [mockTransactions[0]]; // Only approved

      render(<TransactionList transactions={singleTransaction} locale="en" />);

      const rejectedButton = screen.getByRole("button", { name: /status\.rejected/ });
      await user.click(rejectedButton);

      expect(screen.getByText("📭")).toBeInTheDocument();
      expect(screen.getByText("history.emptyState")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    const generateTransactions = (count: number): Transaction[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `tx-${i}`,
        family_id: "family-123",
        child_id: "child-123",
        quest_id: `quest-${i}`,
        stars: 10,
        source: "child_request",
        status: "approved",
        child_note: null,
        parent_response: null,
        created_at: `2025-01-${(i % 28) + 1}T10:00:00Z`,
        updated_at: `2025-01-${(i % 28) + 1}T10:00:00Z`,
        created_by: "child-123",
        custom_description: null,
        quests: {
          name_en: `Task ${i}`,
          name_zh: `任务${i}`,
          icon: "⭐",
          category: "other",
        },
      })) as Transaction[];
    };

    it("should display only 20 transactions initially", () => {
      const transactions = generateTransactions(50);
      render(<TransactionList transactions={transactions} locale="en" />);

      expect(screen.getByText("Task 0")).toBeInTheDocument();
      expect(screen.getByText("Task 19")).toBeInTheDocument();
      expect(screen.queryByText("Task 20")).not.toBeInTheDocument();
    });

    it("should show 'Show more' button when there are more than 20 transactions", () => {
      const transactions = generateTransactions(50);
      render(<TransactionList transactions={transactions} locale="en" />);

      expect(screen.getByRole("button", { name: /history\.showMore/ })).toBeInTheDocument();
      expect(screen.getByText(/\(30/)).toBeInTheDocument(); // (30 common.all)
    });

    it("should not show 'Show more' button when there are 20 or fewer transactions", () => {
      const transactions = generateTransactions(15);
      render(<TransactionList transactions={transactions} locale="en" />);

      expect(screen.queryByRole("button", { name: /history\.showMore/ })).not.toBeInTheDocument();
    });

    it("should load more transactions when 'Show more' is clicked", async () => {
      const user = userEvent.setup();
      const transactions = generateTransactions(50);
      render(<TransactionList transactions={transactions} locale="en" />);

      expect(screen.queryByText("Task 20")).not.toBeInTheDocument();

      const showMoreButton = screen.getByRole("button", { name: /history\.showMore/ });
      await user.click(showMoreButton);

      expect(screen.getByText("Task 20")).toBeInTheDocument();
      expect(screen.getByText("Task 39")).toBeInTheDocument();
      expect(screen.queryByText("Task 40")).not.toBeInTheDocument();
    });

    it("should hide 'Show more' button when all transactions are displayed", async () => {
      const user = userEvent.setup();
      const transactions = generateTransactions(25);
      render(<TransactionList transactions={transactions} locale="en" />);

      const showMoreButton = screen.getByRole("button", { name: /history\.showMore/ });
      await user.click(showMoreButton);

      expect(screen.getByText("Task 24")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /history\.showMore/ })).not.toBeInTheDocument();
    });

    it("should update remaining count after loading more", async () => {
      const user = userEvent.setup();
      const transactions = generateTransactions(50);
      render(<TransactionList transactions={transactions} locale="en" />);

      expect(screen.getByText(/\(30/)).toBeInTheDocument(); // 50 - 20 = 30 remaining

      const showMoreButton = screen.getByRole("button", { name: /history\.showMore/ });
      await user.click(showMoreButton);

      expect(screen.getByText(/\(10/)).toBeInTheDocument(); // 50 - 40 = 10 remaining
    });
  });

  describe("Visual Styling", () => {
    it("should apply success color to positive star values", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const positiveStars = screen.getByText("+10");
      expect(positiveStars.className).toContain("text-success");
    });

    it("should apply danger color to negative star values", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const negativeStars = screen.getByText("-5");
      expect(negativeStars.className).toContain("text-danger");
    });

    it("should apply correct badge color for approved status", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      // Find the badge within the transaction card (not the filter button)
      const transactionCard = screen.getByText("Clean bedroom").closest(".p-4");
      const approvedBadge = within(transactionCard!).getByText("status.approved");
      expect(approvedBadge.className).toContain("bg-success/10");
      expect(approvedBadge.className).toContain("text-success");
    });

    it("should apply correct badge color for pending status", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const transactionCard = screen.getByText("Help with dishes").closest(".p-4");
      const pendingBadge = within(transactionCard!).getByText("status.pending");
      expect(pendingBadge.className).toContain("bg-warning/10");
      expect(pendingBadge.className).toContain("text-warning");
    });

    it("should apply correct badge color for rejected status", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const transactionCard = screen.getByText("Practice piano 30 mins").closest(".p-4");
      const rejectedBadge = within(transactionCard!).getByText("status.rejected");
      expect(rejectedBadge.className).toContain("bg-danger/10");
      expect(rejectedBadge.className).toContain("text-danger");
    });

    it("should apply warning background to pending transactions", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const pendingTransaction = screen.getByText("Help with dishes").closest(".bg-warning\\/5");
      expect(pendingTransaction).toBeInTheDocument();
      expect(pendingTransaction?.className).toContain("border-warning/20");
    });

    it("should apply danger background to rejected transactions", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      const rejectedTransaction = screen.getByText("Practice piano 30 mins").closest(".bg-danger\\/5");
      expect(rejectedTransaction).toBeInTheDocument();
      expect(rejectedTransaction?.className).toContain("border-danger/20");
    });
  });

  describe("Date Formatting", () => {
    it("should format dates in English locale", () => {
      render(<TransactionList transactions={mockTransactions} locale="en" />);

      // Date formatting will depend on the browser locale, but we can check that dates are displayed
      const dates = screen.getAllByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
      expect(dates.length).toBeGreaterThan(0);
    });

    it("should format dates in Chinese locale", () => {
      render(<TransactionList transactions={mockTransactions} locale="zh-CN" />);

      // Verify that dates are rendered (specific format may vary)
      const allText = screen.getByText("打扫房间").closest("div")?.textContent || "";
      expect(allText).toMatch(/\d{4}/); // Contains year
    });
  });

  describe("Edge Cases", () => {
    it("should handle transactions without quest (custom)", () => {
      const customOnly = [mockTransactions[4]]; // tx-5 is custom
      render(<TransactionList transactions={customOnly} locale="en" />);

      expect(screen.getByText("Exceptional behavior at school")).toBeInTheDocument();
      expect(screen.getByText("⭐")).toBeInTheDocument(); // Default icon
    });

    it("should handle empty parent response in rejected transaction", () => {
      const rejectedWithoutResponse: Transaction[] = [
        {
          ...mockTransactions[3],
          parent_response: null,
        },
      ];

      render(<TransactionList transactions={rejectedWithoutResponse} locale="en" />);

      expect(screen.queryByText("history.rejectionReason:")).not.toBeInTheDocument();
    });

    it("should handle quest with null icon", () => {
      const txWithoutIcon: Transaction[] = [
        {
          ...mockTransactions[0],
          stars: 10,
          quests: {
            name_en: "Task",
            name_zh: "任务",
            icon: null,
            category: "other",
          },
        },
      ];

      render(<TransactionList transactions={txWithoutIcon} locale="en" />);

      expect(screen.getByText("⭐")).toBeInTheDocument(); // Default icon for positive stars
    });

    it("should use warning icon for negative stars without quest icon", () => {
      const txNegativeNoIcon: Transaction[] = [
        {
          ...mockTransactions[1],
          quests: {
            name_en: "Violation",
            name_zh: "违规",
            icon: null,
            category: "violations",
          },
        },
      ];

      render(<TransactionList transactions={txNegativeNoIcon} locale="en" />);

      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });
  });
});
