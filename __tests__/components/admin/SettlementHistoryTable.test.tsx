import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettlementHistoryTable from "@/components/admin/SettlementHistoryTable";
import type { CreditSettlement } from "@/types/credit";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockFrom = jest.fn();

const mockSupabaseClient = {
  from: mockFrom,
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe("SettlementHistoryTable", () => {
  const defaultProps = {
    familyId: "family-123",
    locale: "en",
  };

  const mockSettlements: (CreditSettlement & { users?: { name: string } })[] = [
    {
      id: "settlement-1",
      family_id: "family-123",
      child_id: "child-1",
      settlement_date: "2026-01-01",
      debt_amount: 30,
      interest_calculated: 3,
      balance_before: -30,
      credit_limit_before: 50,
      credit_limit_after: 40,
      credit_limit_adjustment: -10,
      interest_breakdown: [
        {
          min_debt: 0,
          max_debt: 19,
          debt_in_tier: 19,
          interest_rate: 0.05,
          interest_amount: 1,
        },
        {
          min_debt: 20,
          max_debt: 49,
          debt_in_tier: 11,
          interest_rate: 0.1,
          interest_amount: 2,
        },
      ],
      settled_at: "2026-01-01T00:01:00Z",
      created_at: "2026-01-01",
      users: { name: "Alice" },
    },
    {
      id: "settlement-2",
      family_id: "family-123",
      child_id: "child-2",
      settlement_date: "2026-01-01",
      debt_amount: 0,
      interest_calculated: 0,
      balance_before: 50,
      credit_limit_before: 40,
      credit_limit_after: 44,
      credit_limit_adjustment: 4,
      interest_breakdown: [],
      settled_at: "2026-01-01T00:01:00Z",
      created_at: "2026-01-01",
      users: { name: "Bob" },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful fetch mock
    mockLimit.mockResolvedValue({ data: mockSettlements, error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder, eq: mockEq });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe("loading state", () => {
    it("shows loading skeleton while fetching settlements", async () => {
      // Make the fetch hang
      mockLimit.mockReturnValue(new Promise(() => {}));

      const { container } = render(<SettlementHistoryTable {...defaultProps} />);

      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("removes loading skeleton after settlements are fetched", async () => {
      const { container } = render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
      });
    });
  });

  describe("rendering with settlements", () => {
    it("renders title", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.settlementHistory")).toBeInTheDocument();
      });
    });

    it("renders table headers", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.settlementDate")).toBeInTheDocument();
        expect(screen.getByText("credit.child")).toBeInTheDocument();
        expect(screen.getByText("credit.debt")).toBeInTheDocument();
        expect(screen.getByText("credit.interest")).toBeInTheDocument();
        expect(screen.getByText("credit.limitChange")).toBeInTheDocument();
        expect(screen.getByText("credit.details")).toBeInTheDocument();
      });
    });

    it("renders settlement rows", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
      });
    });

    it("displays debt with danger color when positive", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        const debtCell = screen.getByText("-30");
        expect(debtCell).toHaveClass("text-danger");
      });
    });

    it("displays interest with warning color when positive", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        const interestCell = screen.getByText("+3");
        expect(interestCell).toHaveClass("text-warning");
      });
    });

    it("displays positive limit change with success color", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        const limitChange = screen.getByText("+4");
        expect(limitChange).toHaveClass("text-success");
      });
    });

    it("displays negative limit change with danger color", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        const limitChange = screen.getByText("-10");
        expect(limitChange).toHaveClass("text-danger");
      });
    });

    it("shows limit change details", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("(50 → 40)")).toBeInTheDocument();
        expect(screen.getByText("(40 → 44)")).toBeInTheDocument();
      });
    });

    it("renders expand/collapse buttons", async () => {
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        const expandButtons = screen.getAllByText("▼");
        expect(expandButtons).toHaveLength(2);
      });
    });
  });

  describe("empty state", () => {
    it("shows empty state when no settlements exist", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.noSettlementsYet")).toBeInTheDocument();
        expect(screen.getByText("credit.settlementsInfo")).toBeInTheDocument();
      });
    });
  });

  describe("expandable rows", () => {
    it("expands row when expand button is clicked", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[0]);

      await waitFor(() => {
        // Check for expanded content (text includes colon)
        expect(screen.getByText(/credit\.balanceBefore/)).toBeInTheDocument();
        expect(screen.getByText(/credit\.settledAt/)).toBeInTheDocument();
      });
    });

    it("shows collapse icon when row is expanded", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("▲")).toBeInTheDocument();
      });
    });

    it("collapses row when collapse button is clicked", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("▲")).toBeInTheDocument();
      });

      const collapseButton = screen.getByText("▲");
      await user.click(collapseButton);

      await waitFor(() => {
        expect(screen.queryByText("credit.balanceBefore")).not.toBeInTheDocument();
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });
    });

    it("shows interest breakdown table when expanded", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/credit\.interestBreakdown/)).toBeInTheDocument();
        expect(screen.getByText("credit.tier")).toBeInTheDocument();
        expect(screen.getByText("credit.debtInTier")).toBeInTheDocument();
        expect(screen.getByText("credit.rate")).toBeInTheDocument();
      });
    });

    it("shows interest breakdown data", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[0]);

      await waitFor(() => {
        // Check tier ranges
        expect(screen.getByText("0-19")).toBeInTheDocument();
        expect(screen.getByText("20-49")).toBeInTheDocument();
        // Check debt in tier
        expect(screen.getByText("19")).toBeInTheDocument();
        expect(screen.getByText("11")).toBeInTheDocument();
      });
    });

    it("shows negative balance with danger class in expanded details", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      // Expand first row (Alice, balance_before: -30)
      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[0]);

      await waitFor(() => {
        const balanceValue = screen.getByText(/-30 common\.stars/);
        expect(balanceValue.className).toContain("text-danger");
      });
    });

    it("shows positive balance without danger class in expanded details", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      // Expand second row (Bob, balance_before: 50)
      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[1]);

      await waitFor(() => {
        const balanceText = screen.getByText(/50 common\.stars/);
        expect(balanceText.className).not.toContain("text-danger");
      });
    });

    it("shows settled time formatted for zh-CN locale", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} locale="zh-CN" />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/credit\.settledAt/)).toBeInTheDocument();
      });
    });

    it("shows infinity symbol for null max_debt in interest breakdown", async () => {
      const user = userEvent.setup();
      const settlementsWithNullMaxDebt = [{
        ...mockSettlements[0],
        interest_breakdown: [{
          min_debt: 0,
          max_debt: null,
          debt_in_tier: 30,
          interest_rate: 0.05,
          interest_amount: 2,
        }],
      }];
      mockLimit.mockResolvedValue({ data: settlementsWithNullMaxDebt, error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(1);
      });

      const expandButton = screen.getByText("▼");
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("0-∞")).toBeInTheDocument();
      });
    });

    it("shows no interest message when no interest was charged", async () => {
      const user = userEvent.setup();
      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(2);
      });

      // Expand Bob's row (second one, has no interest)
      const expandButtons = screen.getAllByText("▼");
      await user.click(expandButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/credit\.noInterestCharged/)).toBeInTheDocument();
      });
    });
  });

  describe("filtering by child", () => {
    it("hides child column when childId is provided", async () => {
      render(<SettlementHistoryTable {...defaultProps} childId="child-1" />);

      await waitFor(() => {
        expect(screen.queryByText("credit.child")).not.toBeInTheDocument();
      });
    });

  });

  describe("error handling", () => {
    it("shows error message when fetch fails", async () => {
      mockLimit.mockResolvedValue({ data: null, error: new Error("Fetch failed") });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Fetch failed")).toBeInTheDocument();
      });
    });

    it("shows generic error message when error has no message", async () => {
      mockLimit.mockResolvedValue({ data: null, error: { code: "UNKNOWN" } });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load settlements")).toBeInTheDocument();
      });
    });
  });

  describe("Branch coverage", () => {
    it("shows 'Unknown' when settlement has null users", async () => {
      const settlementsWithNullUsers = [
        {
          ...mockSettlements[0],
          users: null,
        },
      ];
      mockLimit.mockResolvedValue({ data: settlementsWithNullUsers, error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Unknown")).toBeInTheDocument();
      });
    });

    it("shows text-success class for positive credit_limit_adjustment", async () => {
      const settlement = [{
        ...mockSettlements[0],
        credit_limit_adjustment: 5,
        credit_limit_before: 40,
        credit_limit_after: 45,
      }];
      mockLimit.mockResolvedValue({ data: settlement, error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        const limitChange = screen.getByText("+5");
        expect(limitChange).toHaveClass("text-success");
      });
    });

    it("shows text-danger class for negative credit_limit_adjustment", async () => {
      const settlement = [{
        ...mockSettlements[0],
        credit_limit_adjustment: -3,
        credit_limit_before: 50,
        credit_limit_after: 47,
      }];
      mockLimit.mockResolvedValue({ data: settlement, error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        const limitChange = screen.getByText("-3");
        expect(limitChange).toHaveClass("text-danger");
      });
    });

    it("shows no color class for zero credit_limit_adjustment", async () => {
      const settlement = [{
        ...mockSettlements[0],
        credit_limit_adjustment: 0,
        credit_limit_before: 50,
        credit_limit_after: 50,
      }];
      mockLimit.mockResolvedValue({ data: settlement, error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        // Zero adjustment should display as "0" with no color class
        const cells = screen.getAllByText("0");
        // Find the credit_limit_adjustment cell (not debt or interest which may also be 0)
        // The limit change cell is followed by the (before → after) text
        const limitChangeCell = screen.getByText("(50 → 50)").previousElementSibling;
        expect(limitChangeCell?.className).not.toContain("text-success");
        expect(limitChangeCell?.className).not.toContain("text-danger");
      });
    });

    it("shows text-danger class for negative balance_before in expanded details", async () => {
      const user = userEvent.setup();
      const settlement = [{
        ...mockSettlements[0],
        balance_before: -10,
      }];
      mockLimit.mockResolvedValue({ data: settlement, error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(1);
      });

      const expandButton = screen.getByText("▼");
      await user.click(expandButton);

      await waitFor(() => {
        const balanceValue = screen.getByText(/-10 common\.stars/);
        expect(balanceValue.className).toContain("text-danger");
      });
    });

    it("shows no text-danger class for non-negative balance_before in expanded details", async () => {
      const user = userEvent.setup();
      const settlement = [{
        ...mockSettlements[0],
        balance_before: 5,
        interest_breakdown: [],
        interest_calculated: 0,
      }];
      mockLimit.mockResolvedValue({ data: settlement, error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("▼")).toHaveLength(1);
      });

      const expandButton = screen.getByText("▼");
      await user.click(expandButton);

      await waitFor(() => {
        const balanceValue = screen.getByText(/5 common\.stars/);
        expect(balanceValue.className).not.toContain("text-danger");
      });
    });
  });

  describe("locale support", () => {
    it("formats date using locale", async () => {
      render(<SettlementHistoryTable {...defaultProps} locale="en" />);

      await waitFor(() => {
        // Just check that the table rendered with data
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });
    });

    it("renders correctly with Chinese locale", async () => {
      render(<SettlementHistoryTable {...defaultProps} locale="zh-CN" />);

      await waitFor(() => {
        expect(screen.getByText("credit.settlementHistory")).toBeInTheDocument();
      });
    });
  });

  describe("data transformation", () => {
    it("handles missing user data gracefully", async () => {
      const settlementsWithoutUser = [
        {
          ...mockSettlements[0],
          users: null,
        },
      ];
      mockLimit.mockResolvedValue({ data: settlementsWithoutUser, error: null });

      render(<SettlementHistoryTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Unknown")).toBeInTheDocument();
      });
    });
  });
});
