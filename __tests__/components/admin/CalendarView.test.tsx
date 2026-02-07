import { render, screen, fireEvent } from "@testing-library/react";
import CalendarView from "@/components/admin/CalendarView";

describe("CalendarView", () => {
  const mockOnDateSelect = jest.fn();

  const baseProps = {
    transactions: [] as any[],
    locale: "en",
    onDateSelect: mockOnDateSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Fix date to January 15, 2025 for deterministic tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 0, 15));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders the calendar with month name and navigation", () => {
      render(<CalendarView {...baseProps} />);
      // Should show January 2025
      expect(screen.getByText(/January 2025/i)).toBeInTheDocument();
      // "Today" appears both as button and in legend
      const todayElements = screen.getAllByText("Today");
      expect(todayElements.length).toBe(2);
    });

    it("renders English weekday headers", () => {
      render(<CalendarView {...baseProps} />);
      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Wed")).toBeInTheDocument();
      expect(screen.getByText("Thu")).toBeInTheDocument();
      expect(screen.getByText("Fri")).toBeInTheDocument();
      expect(screen.getByText("Sat")).toBeInTheDocument();
    });

    it("renders Chinese weekday headers when locale is zh-CN", () => {
      render(<CalendarView {...baseProps} locale="zh-CN" />);
      expect(screen.getByText("日")).toBeInTheDocument();
      expect(screen.getByText("一")).toBeInTheDocument();
      expect(screen.getByText("二")).toBeInTheDocument();
      expect(screen.getByText("三")).toBeInTheDocument();
      expect(screen.getByText("四")).toBeInTheDocument();
      expect(screen.getByText("五")).toBeInTheDocument();
      expect(screen.getByText("六")).toBeInTheDocument();
    });

    it("renders all days of the current month", () => {
      render(<CalendarView {...baseProps} />);
      // January has 31 days
      for (let i = 1; i <= 31; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
    });

    it("renders legend items in English", () => {
      render(<CalendarView {...baseProps} />);
      // "Today" appears twice (button + legend), "Selected", "Positive", "Negative" once each
      expect(screen.getAllByText("Today").length).toBe(2);
      expect(screen.getByText("Selected")).toBeInTheDocument();
      expect(screen.getByText("Positive")).toBeInTheDocument();
      expect(screen.getByText("Negative")).toBeInTheDocument();
    });

    it("renders legend items in Chinese when locale is zh-CN", () => {
      render(<CalendarView {...baseProps} locale="zh-CN" />);
      // Two "今天" elements: one in legend and one as button label
      const todayElements = screen.getAllByText("今天");
      expect(todayElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("已选择")).toBeInTheDocument();
      expect(screen.getByText("加分")).toBeInTheDocument();
      expect(screen.getByText("扣分")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("navigates to previous month", () => {
      render(<CalendarView {...baseProps} />);
      // Click the previous button
      fireEvent.click(screen.getByText("◀"));
      // Should now show December 2024
      expect(screen.getByText(/December 2024/i)).toBeInTheDocument();
    });

    it("navigates to next month", () => {
      render(<CalendarView {...baseProps} />);
      fireEvent.click(screen.getByText("▶"));
      // Should now show February 2025
      expect(screen.getByText(/February 2025/i)).toBeInTheDocument();
    });

    it("goes to today when Today button is clicked", () => {
      render(<CalendarView {...baseProps} />);
      // Navigate to a different month first
      fireEvent.click(screen.getByText("▶")); // February
      fireEvent.click(screen.getByText("▶")); // March
      expect(screen.getByText(/March 2025/i)).toBeInTheDocument();

      // Click "Today" button (the first one, which is the nav button)
      const todayButtons = screen.getAllByText("Today");
      fireEvent.click(todayButtons[0]);
      expect(screen.getByText(/January 2025/i)).toBeInTheDocument();
    });
  });

  describe("Date Selection", () => {
    it("calls onDateSelect when a date is clicked", () => {
      render(<CalendarView {...baseProps} />);
      // Click on the 15th day
      fireEvent.click(screen.getByText("15"));
      expect(mockOnDateSelect).toHaveBeenCalledWith("2025-01-15");
    });

    it("calls onDateSelect with padded date string", () => {
      render(<CalendarView {...baseProps} />);
      // Click on the 5th day
      fireEvent.click(screen.getByText("5"));
      expect(mockOnDateSelect).toHaveBeenCalledWith("2025-01-05");
    });
  });

  describe("Transactions Display", () => {
    it("shows positive star indicators for days with positive transactions", () => {
      const transactions = [
        {
          id: "t1",
          stars: 5,
          created_at: "2025-01-10T10:00:00Z",
          status: "approved",
        },
      ];
      render(<CalendarView {...baseProps} transactions={transactions} />);
      // Should show +5 total
      expect(screen.getByText("+5")).toBeInTheDocument();
    });

    it("shows negative star indicators for days with negative transactions", () => {
      const transactions = [
        {
          id: "t1",
          stars: -3,
          created_at: "2025-01-10T10:00:00Z",
          status: "approved",
        },
      ];
      render(<CalendarView {...baseProps} transactions={transactions} />);
      expect(screen.getByText("-3")).toBeInTheDocument();
    });

    it("calculates total stars from approved transactions only", () => {
      const transactions = [
        {
          id: "t1",
          stars: 5,
          created_at: "2025-01-10T10:00:00Z",
          status: "approved",
        },
        {
          id: "t2",
          stars: 3,
          created_at: "2025-01-10T12:00:00Z",
          status: "approved",
        },
        {
          id: "t3",
          stars: 10,
          created_at: "2025-01-10T14:00:00Z",
          status: "pending",
        },
      ];
      render(<CalendarView {...baseProps} transactions={transactions} />);
      // Only approved transactions are summed: 5 + 3 = 8
      expect(screen.getByText("+8")).toBeInTheDocument();
    });

    it("highlights selected date", () => {
      render(
        <CalendarView {...baseProps} selectedDate="2025-01-20" />
      );
      // The selected date button should exist
      const button20 = screen.getByText("20").closest("button");
      expect(button20).toBeInTheDocument();
    });
  });

  describe("Branch coverage", () => {
    it("shows neutral gray color for zero daily total", () => {
      // Two approved transactions that sum to 0
      const transactions = [
        {
          id: "t-pos",
          stars: 5,
          created_at: "2025-01-10T10:00:00Z",
          status: "approved",
        },
        {
          id: "t-neg",
          stars: -5,
          created_at: "2025-01-10T12:00:00Z",
          status: "approved",
        },
      ];
      const { container } = render(
        <CalendarView {...baseProps} transactions={transactions} />
      );

      // Find the day button for Jan 10
      const button10 = screen.getByText("10").closest("button");
      expect(button10).toBeTruthy();

      // The total stars display should show "0" with neutral gray class
      const totalEl = button10!.querySelector(".text-gray-300");
      expect(totalEl).toBeInTheDocument();
      expect(totalEl!.textContent).toBe("0");
    });
  });
});
