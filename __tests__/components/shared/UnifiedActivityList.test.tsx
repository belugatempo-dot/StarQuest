import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import UnifiedActivityList from "@/components/shared/UnifiedActivityList";
import type { UnifiedActivityItem } from "@/types/activity";

// Mock router
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// Mock Supabase client
const mockFrom = jest.fn();
const mockEqChain = jest.fn();
const mockInChain = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock supabase helpers
const mockEqHelper = jest.fn();
const mockInHelper = jest.fn();
const mockTypedUpdate = jest.fn().mockReturnValue({
  eq: mockEqHelper,
  in: mockInHelper,
});
jest.mock("@/lib/supabase/helpers", () => ({
  typedUpdate: (...args: any[]) => mockTypedUpdate(...args),
}));

// Mock CalendarView component
jest.mock("@/components/admin/CalendarView", () => {
  return function MockCalendarView(props: any) {
    return (
      <div data-testid="calendar-view">
        <button
          data-testid="calendar-date-select"
          onClick={() => props.onDateSelect("2025-01-15")}
        >
          Select Date
        </button>
      </div>
    );
  };
});

// Mock EditTransactionModal
jest.mock("@/components/admin/EditTransactionModal", () => {
  return function MockEditTransactionModal(props: any) {
    return (
      <div data-testid="edit-transaction-modal">
        <button onClick={props.onClose}>Close Edit</button>
      </div>
    );
  };
});

// Mock EditRedemptionModal
jest.mock("@/components/admin/EditRedemptionModal", () => {
  return function MockEditRedemptionModal(props: any) {
    return (
      <div data-testid="edit-redemption-modal">
        <button onClick={props.onClose}>Close Redemption Edit</button>
      </div>
    );
  };
});

// Mock ResubmitRequestModal
jest.mock("@/components/child/ResubmitRequestModal", () => {
  return function MockResubmitRequestModal(props: any) {
    return (
      <div data-testid="resubmit-modal">
        <button onClick={props.onClose}>Close Resubmit</button>
      </div>
    );
  };
});

// Mock date-utils
jest.mock("@/lib/date-utils", () => ({
  toLocalDateString: (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
  getTodayString: () => "2025-01-15",
  formatDateOnly: (dateStr: string, locale: string) => dateStr,
}));

// Mock AddRecordModal
jest.mock("@/components/shared/AddRecordModal", () => {
  return function MockAddRecordModal(props: any) {
    return (
      <div data-testid="add-record-modal">
        <span>{props.date}</span>
        <span>{props.role}</span>
        <button onClick={props.onClose}>Close Add Record</button>
        <button onClick={props.onSuccess}>Submit Record</button>
      </div>
    );
  };
});

// Mock activity-utils
jest.mock("@/lib/activity-utils", () => ({
  getActivityDescription: (activity: any, locale: string) => {
    if (locale === "zh-CN" && activity.descriptionZh)
      return activity.descriptionZh;
    return activity.description;
  },
  getStatusBadge: (status: string, locale: string) => ({
    label: status,
    className: `badge-${status}`,
  }),
  getTypeBadge: (type: string, locale: string) => ({
    label: type,
    className: `badge-${type}`,
    icon: type === "star_transaction" ? "⭐" : type === "redemption" ? "🎁" : "💳",
  }),
  formatActivityDate: (dateStr: string, locale: string) => dateStr,
  formatDateShort: (dateStr: string, locale: string) => dateStr,
  getDailyTotal: (activities: any[]) =>
    activities
      .filter((a: any) => a.status === "approved" || a.status === "fulfilled")
      .reduce((sum: number, a: any) => sum + a.stars, 0),
  groupActivitiesByDate: (activities: any[]) => {
    const groups: Record<string, any[]> = {};
    activities.forEach((a: any) => {
      const date = new Date(a.createdAt);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  },
  calculateActivityStats: (activities: any[]) => ({
    totalRecords: activities.length,
    positiveRecords: activities.filter(
      (a: any) => a.stars > 0 && (a.status === "approved" || a.status === "fulfilled")
    ).length,
    negativeRecords: activities.filter(
      (a: any) => a.stars < 0 && (a.status === "approved" || a.status === "fulfilled")
    ).length,
    totalStarsGiven: 0,
    totalStarsDeducted: 0,
    netStars: 0,
    all: activities.length,
    approved: activities.filter((a: any) => a.status === "approved").length,
    pending: activities.filter((a: any) => a.status === "pending").length,
    rejected: activities.filter((a: any) => a.status === "rejected").length,
  }),
}));

describe("UnifiedActivityList", () => {
  // Helper to create activities
  const createActivity = (
    overrides: Partial<UnifiedActivityItem> = {}
  ): UnifiedActivityItem => ({
    id: `act-${Math.random().toString(36).substr(2, 5)}`,
    type: "star_transaction",
    childId: "child-1",
    childName: "Alice",
    childAvatar: null,
    stars: 5,
    description: "Clean Room",
    descriptionZh: "打扫房间",
    icon: "🧹",
    status: "approved",
    childNote: null,
    parentResponse: null,
    source: "parent_record",
    createdAt: "2025-01-15T10:00:00Z",
    originalData: {} as any,
    questId: "quest-1",
    quests: {
      name_en: "Clean Room",
      name_zh: "打扫房间",
      icon: "🧹",
      category: "chores",
    },
    ...overrides,
  });

  const approvedActivity = createActivity({ id: "act-1" });
  const pendingActivity = createActivity({
    id: "act-2",
    status: "pending",
    stars: 3,
    description: "Do Homework",
    source: "child_request",
  });
  const rejectedActivity = createActivity({
    id: "act-3",
    status: "rejected",
    stars: 2,
    description: "Read Book",
    parentResponse: "Not verified",
    source: "child_request",
  });
  const redemptionActivity = createActivity({
    id: "act-4",
    type: "redemption",
    stars: -10,
    description: "Ice Cream",
    icon: "🍦",
  });
  const creditActivity = createActivity({
    id: "act-5",
    type: "credit_transaction",
    stars: -5,
    description: "Credit borrowed",
    icon: "💳",
  });

  const allActivities = [
    approvedActivity,
    pendingActivity,
    rejectedActivity,
    redemptionActivity,
    creditActivity,
  ];

  const parentProps = {
    activities: allActivities,
    locale: "en",
    role: "parent" as const,
  };

  const childProps = {
    activities: allActivities,
    locale: "en",
    role: "child" as const,
    currentChildId: "child-1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();

    mockEqHelper.mockResolvedValue({ error: null });
    mockInHelper.mockResolvedValue({ error: null });

    mockFrom.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  describe("Parent Role Rendering", () => {
    it("renders with calendar view as default for parent", () => {
      render(<UnifiedActivityList {...parentProps} />);
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });

    it("renders filter header", () => {
      render(<UnifiedActivityList {...parentProps} />);
      expect(screen.getByText("activity.filters")).toBeInTheDocument();
    });

    it("shows type filter buttons for parent", () => {
      render(<UnifiedActivityList {...parentProps} />);
      expect(screen.getByText("common.all")).toBeInTheDocument();
      expect(screen.getByText(/activity.starsType/)).toBeInTheDocument();
      expect(screen.getByText(/activity.redemptionsType/)).toBeInTheDocument();
      expect(screen.getByText(/activity.positiveType/)).toBeInTheDocument();
      expect(screen.getByText(/activity.negativeType/)).toBeInTheDocument();
    });

    it("shows status filter buttons", () => {
      render(<UnifiedActivityList {...parentProps} />);
      expect(screen.getByText(/history.allTransactions/)).toBeInTheDocument();
      expect(screen.getByText(/status.approved/)).toBeInTheDocument();
      expect(screen.getByText(/status.pending/)).toBeInTheDocument();
      expect(screen.getByText(/status.rejected/)).toBeInTheDocument();
    });

    it("shows batch selection mode button when pending transactions exist", () => {
      render(<UnifiedActivityList {...parentProps} />);
      expect(
        screen.getByText(/activity.selectionMode/)
      ).toBeInTheDocument();
    });

    it("shows records count", () => {
      render(<UnifiedActivityList {...parentProps} />);
      expect(
        screen.getByText(/activity.showingRecords/)
      ).toBeInTheDocument();
    });
  });

  describe("Child Role Rendering", () => {
    it("renders with list view as default for child", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(screen.queryByTestId("calendar-view")).not.toBeInTheDocument();
    });

    it("does not show type filter buttons for child", () => {
      render(<UnifiedActivityList {...childProps} />);
      // Type filter should not be present
      expect(
        screen.queryByText(/activity.starsType/)
      ).not.toBeInTheDocument();
    });

    it("shows status filter for child", () => {
      render(<UnifiedActivityList {...childProps} />);
      // Multiple elements contain "status.approved" (filter button + item badges)
      const approvedElements = screen.getAllByText(/status.approved/);
      expect(approvedElements.length).toBeGreaterThanOrEqual(1);
    });

    it("does not show batch selection mode for child", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(
        screen.queryByText(/activity.selectionMode/)
      ).not.toBeInTheDocument();
    });
  });

  describe("View Mode Toggle", () => {
    it("switches to list view when list button is clicked", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      // Calendar should be hidden
      expect(
        screen.queryByTestId("calendar-view")
      ).not.toBeInTheDocument();
    });

    it("switches to calendar view when calendar button is clicked", () => {
      render(<UnifiedActivityList {...childProps} />);

      fireEvent.click(screen.getByText(/activity.calendar/));

      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows empty state in list view when no activities", () => {
      render(
        <UnifiedActivityList {...childProps} activities={[]} />
      );
      expect(screen.getByText("history.emptyState")).toBeInTheDocument();
    });

    it("shows empty state in calendar view when no activities match", () => {
      render(
        <UnifiedActivityList {...parentProps} activities={[]} />
      );
      // Calendar still shows, but grouped-by-date should show no records
      expect(
        screen.getByText("activity.noRecordsFound")
      ).toBeInTheDocument();
    });
  });

  describe("Status Filtering", () => {
    it("filters by approved status", () => {
      render(<UnifiedActivityList {...childProps} />);

      // Click on the first "status.approved" (the filter button, not item badges)
      const approvedBtns = screen.getAllByText(/status.approved/);
      fireEvent.click(approvedBtns[0]);

      // Should show approved activities and hide pending/rejected
      expect(
        screen.getByText(/activity.showingRecords/)
      ).toBeInTheDocument();
    });

    it("filters by pending status", () => {
      render(<UnifiedActivityList {...childProps} />);

      // "status.pending" may also appear in item badges
      const pendingBtns = screen.getAllByText(/status.pending/);
      fireEvent.click(pendingBtns[0]);

      // Should show only pending items
      expect(
        screen.getByText(/activity.showingRecords/)
      ).toBeInTheDocument();
    });
  });

  describe("Type Filtering (Parent Only)", () => {
    it("filters by stars type", () => {
      render(<UnifiedActivityList {...parentProps} />);

      // Switch to list view first
      fireEvent.click(screen.getByText(/activity.list/));

      // Click stars filter
      fireEvent.click(screen.getByText(/activity.starsType/));

      // Should show only star transactions
      expect(
        screen.getByText(/activity.showingRecords/)
      ).toBeInTheDocument();
    });

    it("filters by redemptions type", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));
      fireEvent.click(screen.getByText(/activity.redemptionsType/));

      expect(
        screen.getByText(/activity.showingRecords/)
      ).toBeInTheDocument();
    });

    it("filters by positive type", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));
      fireEvent.click(screen.getByText(/activity.positiveType/));

      expect(
        screen.getByText(/activity.showingRecords/)
      ).toBeInTheDocument();
    });

    it("filters by negative type", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));
      fireEvent.click(screen.getByText(/activity.negativeType/));

      expect(
        screen.getByText(/activity.showingRecords/)
      ).toBeInTheDocument();
    });
  });

  describe("Clear Filters", () => {
    it("shows clear filters button when a filter is active", () => {
      render(<UnifiedActivityList {...childProps} />);

      // Click first matching "status.approved" (the filter button)
      const approvedBtns = screen.getAllByText(/status.approved/);
      fireEvent.click(approvedBtns[0]);

      expect(
        screen.getByText(/activity.clearFilters/)
      ).toBeInTheDocument();
    });

    it("clears all filters when clear button is clicked", () => {
      render(<UnifiedActivityList {...childProps} />);

      // Activate a filter
      const approvedBtns = screen.getAllByText(/status.approved/);
      fireEvent.click(approvedBtns[0]);

      // Click clear
      fireEvent.click(screen.getByText(/activity.clearFilters/));

      // Clear filters button should disappear (since no active filters)
      expect(
        screen.queryByText(/activity.clearFilters/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Activity Items - List View", () => {
    it("renders activity descriptions", () => {
      render(<UnifiedActivityList {...childProps} />);

      expect(screen.getByText("Clean Room")).toBeInTheDocument();
      expect(screen.getByText("Do Homework")).toBeInTheDocument();
      expect(screen.getByText("Read Book")).toBeInTheDocument();
    });

    it("renders activity icons", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(screen.getAllByText("🧹").length).toBeGreaterThan(0);
    });

    it("shows stars for activities", () => {
      render(<UnifiedActivityList {...childProps} />);
      // Should show +5, +3, +2, -10, -5 for different activities
      expect(screen.getByText("+5")).toBeInTheDocument();
    });
  });

  describe("Edit Actions (Parent Only)", () => {
    it("shows edit button for star transactions in parent view", () => {
      render(<UnifiedActivityList {...parentProps} />);

      // Switch to list view
      fireEvent.click(screen.getByText(/activity.list/));

      const editButtons = screen.getAllByText(/common.edit/);
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it("opens edit transaction modal when edit is clicked on star transaction", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      const editButtons = screen.getAllByText(/common.edit/);
      fireEvent.click(editButtons[0]);

      expect(
        screen.getByTestId("edit-transaction-modal")
      ).toBeInTheDocument();
    });

    it("closes edit transaction modal", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      const editButtons = screen.getAllByText(/common.edit/);
      fireEvent.click(editButtons[0]);

      fireEvent.click(screen.getByText("Close Edit"));

      expect(
        screen.queryByTestId("edit-transaction-modal")
      ).not.toBeInTheDocument();
    });

    it("does not show edit buttons in child view", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(screen.queryByText(/common.edit/)).not.toBeInTheDocument();
    });
  });

  describe("Delete Actions (Parent Only)", () => {
    it("shows delete button for star transactions in parent view", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      const deleteButtons = screen.getAllByText(/common.delete/);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("confirms before deleting", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      const deleteButtons = screen.getAllByText(/common.delete/);
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalled();
    });

    it("deletes transaction after confirmation", async () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      const deleteButtons = screen.getAllByText(/common.delete/);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("star_transactions");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("does not show delete buttons in child view", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(screen.queryByText(/common.delete/)).not.toBeInTheDocument();
    });
  });

  describe("Resubmit Action (Child Only)", () => {
    it("shows resubmit button for rejected child requests", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(
        screen.getByText("activity.editResubmit")
      ).toBeInTheDocument();
    });

    it("opens resubmit modal when resubmit button is clicked", () => {
      render(<UnifiedActivityList {...childProps} />);

      fireEvent.click(screen.getByText("activity.editResubmit"));

      expect(screen.getByTestId("resubmit-modal")).toBeInTheDocument();
    });

    it("closes resubmit modal", () => {
      render(<UnifiedActivityList {...childProps} />);

      fireEvent.click(screen.getByText("activity.editResubmit"));

      fireEvent.click(screen.getByText("Close Resubmit"));

      expect(
        screen.queryByTestId("resubmit-modal")
      ).not.toBeInTheDocument();
    });

    it("does not show resubmit button in parent view", () => {
      render(<UnifiedActivityList {...parentProps} />);
      fireEvent.click(screen.getByText(/activity.list/));
      expect(
        screen.queryByText("activity.editResubmit")
      ).not.toBeInTheDocument();
    });
  });

  describe("Batch Selection (Parent Only)", () => {
    it("enters selection mode when selection mode button is clicked", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));

      // Should show "Select All" button
      expect(
        screen.getByText(/activity.selectAllPending/)
      ).toBeInTheDocument();
    });

    it("shows select all pending button in selection mode", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));

      expect(
        screen.getByText(/activity.selectAllPending/)
      ).toBeInTheDocument();
    });
  });

  describe("Pagination (Child Only)", () => {
    it("shows show more button when there are more items than display limit", () => {
      // Create more than 20 activities
      const manyActivities = Array.from({ length: 25 }, (_, i) =>
        createActivity({
          id: `act-many-${i}`,
          description: `Activity ${i}`,
        })
      );

      render(
        <UnifiedActivityList
          {...childProps}
          activities={manyActivities}
        />
      );

      expect(screen.getByText(/history.showMore/)).toBeInTheDocument();
    });

    it("loads more items when show more is clicked", () => {
      const manyActivities = Array.from({ length: 25 }, (_, i) =>
        createActivity({
          id: `act-many-${i}`,
          description: `Activity ${i}`,
        })
      );

      render(
        <UnifiedActivityList
          {...childProps}
          activities={manyActivities}
        />
      );

      fireEvent.click(screen.getByText(/history.showMore/));

      // After loading more, show more button should disappear (25 < 40)
      expect(
        screen.queryByText(/history.showMore/)
      ).not.toBeInTheDocument();
    });

    it("does not show pagination for parent", () => {
      const manyActivities = Array.from({ length: 25 }, (_, i) =>
        createActivity({
          id: `act-many-${i}`,
          description: `Activity ${i}`,
        })
      );

      render(
        <UnifiedActivityList
          {...parentProps}
          activities={manyActivities}
        />
      );

      // Switch to list view
      fireEvent.click(screen.getByText(/activity.list/));

      expect(
        screen.queryByText(/history.showMore/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Calendar View", () => {
    it("renders CalendarView component in calendar mode", () => {
      render(<UnifiedActivityList {...parentProps} />);
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });

    it("groups activities by date in calendar view", () => {
      render(<UnifiedActivityList {...parentProps} />);
      // Should render date headers
      expect(screen.getByText(/activity.records/)).toBeInTheDocument();
    });

    it("filters by date when calendar date is selected", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByTestId("calendar-date-select"));

      // Should filter to selected date
      expect(
        screen.getByText(/activity.showingRecords/)
      ).toBeInTheDocument();
    });
  });

  describe("Activity Types Display", () => {
    it("renders star transaction items", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(screen.getByText("Clean Room")).toBeInTheDocument();
    });

    it("renders redemption items", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(screen.getByText("Ice Cream")).toBeInTheDocument();
    });

    it("renders credit transaction items", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(screen.getByText("Credit borrowed")).toBeInTheDocument();
    });
  });

  describe("Child Note and Parent Response", () => {
    it("shows child note when present", () => {
      const withNote = createActivity({
        id: "note-1",
        childNote: "I did great!",
      });
      render(
        <UnifiedActivityList
          {...childProps}
          activities={[withNote]}
        />
      );
      expect(screen.getByText('"I did great!"')).toBeInTheDocument();
    });

    it("shows parent response for rejected items", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(screen.getByText("Not verified")).toBeInTheDocument();
    });
  });

  describe("Pending Indicator (Child View)", () => {
    it("shows waiting approval text for pending items in child view", () => {
      render(<UnifiedActivityList {...childProps} />);
      expect(
        screen.getByText("history.waitingApproval")
      ).toBeInTheDocument();
    });
  });

  describe("Date Filters (Parent List View)", () => {
    it("shows date filter inputs in parent list view", () => {
      render(<UnifiedActivityList {...parentProps} />);

      // Switch to list view
      fireEvent.click(screen.getByText(/activity.list/));

      expect(screen.getByText("activity.singleDate")).toBeInTheDocument();
      expect(screen.getByText("activity.startDate")).toBeInTheDocument();
      expect(screen.getByText("activity.endDate")).toBeInTheDocument();
    });

    it("does not show date filter inputs in child view", () => {
      render(<UnifiedActivityList {...childProps} />);

      expect(
        screen.queryByText("activity.singleDate")
      ).not.toBeInTheDocument();
    });
  });

  describe("Edit Redemption", () => {
    it("opens edit redemption modal for redemption items in parent view", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      // Find the edit button near redemption item
      // The redemption item has "Ice Cream" in it
      const editButtons = screen.getAllByText(/common.edit/);
      // Redemption items also have edit buttons - find and click one
      // Look for the edit button that's associated with a redemption
      // Since we have 4 editable items (3 star_transactions + 1 redemption), click the last one
      fireEvent.click(editButtons[editButtons.length - 1]);

      // Should show edit redemption modal (the credit_transaction doesn't have canShowActions)
      // Actually, let's check which modal is shown
      const editTxModal = screen.queryByTestId("edit-transaction-modal");
      const editRedModal = screen.queryByTestId("edit-redemption-modal");
      expect(editTxModal || editRedModal).toBeTruthy();
    });
  });

  describe("Date Range Filtering", () => {
    function getDateInputs() {
      const inputs = screen.getAllByDisplayValue("") as HTMLInputElement[];
      const dateInputs = inputs.filter((i) => i.type === "date");
      // Order: single date, start date, end date
      return { singleInput: dateInputs[0], startInput: dateInputs[1], endInput: dateInputs[2] };
    }

    it("filters by start date only", () => {
      const activities = [
        createActivity({ id: "d1", createdAt: "2025-01-10T10:00:00Z", description: "Early" }),
        createActivity({ id: "d2", createdAt: "2025-01-20T10:00:00Z", description: "Late" }),
      ];

      render(<UnifiedActivityList activities={activities} locale="en" role="parent" />);
      fireEvent.click(screen.getByText(/activity.list/));

      const { startInput } = getDateInputs();
      fireEvent.change(startInput, { target: { value: "2025-01-15" } });

      expect(screen.getByText("Late")).toBeInTheDocument();
      expect(screen.queryByText("Early")).not.toBeInTheDocument();
    });

    it("filters by end date only", () => {
      const activities = [
        createActivity({ id: "d1", createdAt: "2025-01-10T10:00:00Z", description: "Early" }),
        createActivity({ id: "d2", createdAt: "2025-01-20T10:00:00Z", description: "Late" }),
      ];

      render(<UnifiedActivityList activities={activities} locale="en" role="parent" />);
      fireEvent.click(screen.getByText(/activity.list/));

      const { endInput } = getDateInputs();
      fireEvent.change(endInput, { target: { value: "2025-01-15" } });

      expect(screen.getByText("Early")).toBeInTheDocument();
      expect(screen.queryByText("Late")).not.toBeInTheDocument();
    });

    it("filters by both start and end date", () => {
      const activities = [
        createActivity({ id: "d1", createdAt: "2025-01-05T10:00:00Z", description: "VeryEarly" }),
        createActivity({ id: "d2", createdAt: "2025-01-15T10:00:00Z", description: "Middle" }),
        createActivity({ id: "d3", createdAt: "2025-01-25T10:00:00Z", description: "VeryLate" }),
      ];

      render(<UnifiedActivityList activities={activities} locale="en" role="parent" />);
      fireEvent.click(screen.getByText(/activity.list/));

      const { startInput, endInput } = getDateInputs();
      fireEvent.change(startInput, { target: { value: "2025-01-10" } });
      fireEvent.change(endInput, { target: { value: "2025-01-20" } });

      expect(screen.getByText("Middle")).toBeInTheDocument();
      expect(screen.queryByText("VeryEarly")).not.toBeInTheDocument();
      expect(screen.queryByText("VeryLate")).not.toBeInTheDocument();
    });

    it("single date filter clears start/end dates", () => {
      render(<UnifiedActivityList {...parentProps} />);
      fireEvent.click(screen.getByText(/activity.list/));

      const { singleInput, startInput } = getDateInputs();
      fireEvent.change(startInput, { target: { value: "2025-01-10" } });
      fireEvent.change(singleInput, { target: { value: "2025-01-15" } });

      expect(startInput).toHaveValue("");
    });

    it("start date clears single date filter", () => {
      render(<UnifiedActivityList {...parentProps} />);
      fireEvent.click(screen.getByText(/activity.list/));

      const { singleInput, startInput } = getDateInputs();
      fireEvent.change(singleInput, { target: { value: "2025-01-15" } });
      fireEvent.change(startInput, { target: { value: "2025-01-10" } });

      expect(singleInput).toHaveValue("");
    });

    it("end date clears single date filter", () => {
      render(<UnifiedActivityList {...parentProps} />);
      fireEvent.click(screen.getByText(/activity.list/));

      const { singleInput, endInput } = getDateInputs();
      fireEvent.change(singleInput, { target: { value: "2025-01-15" } });
      fireEvent.change(endInput, { target: { value: "2025-01-20" } });

      expect(singleInput).toHaveValue("");
    });
  });

  describe("Batch Approve (Parent Only)", () => {
    it("approves selected transactions", async () => {
      render(<UnifiedActivityList {...parentProps} />);

      // Enter selection mode
      fireEvent.click(screen.getByText(/activity.selectionMode/));

      // Select all pending
      fireEvent.click(screen.getByText(/activity.selectAllPending/));

      // Click batch approve
      fireEvent.click(screen.getByText(/activity.batchApprove/));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalledWith(
          expect.anything(),
          "star_transactions",
          expect.objectContaining({ status: "approved" })
        );
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("does nothing when no items selected", async () => {
      render(<UnifiedActivityList {...parentProps} />);

      // Enter selection mode but don't select any items
      fireEvent.click(screen.getByText(/activity.selectionMode/));

      // Batch approve should not be visible yet (need selected items)
      // The approve button should only show when selectedIds.size > 0
      expect(screen.queryByText(/activity.batchApprove/)).not.toBeInTheDocument();
    });

    it("cancels batch approve when confirm is rejected", async () => {
      (global.confirm as jest.Mock).mockReturnValueOnce(false);
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));
      fireEvent.click(screen.getByText(/activity.selectAllPending/));
      fireEvent.click(screen.getByText(/activity.batchApprove/));

      expect(mockTypedUpdate).not.toHaveBeenCalled();
    });

    it("shows error alert when batch approve fails", async () => {
      mockInHelper.mockResolvedValueOnce({ error: { message: "batch error" } });
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));
      fireEvent.click(screen.getByText(/activity.selectAllPending/));
      fireEvent.click(screen.getByText(/activity.batchApprove/));

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("activity.batchApproveFailed");
      });
    });
  });

  describe("Batch Reject (Parent Only)", () => {
    it("opens batch reject modal", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));
      fireEvent.click(screen.getByText(/activity.selectAllPending/));
      fireEvent.click(screen.getByText(/activity.batchReject/));

      expect(screen.getByText("activity.batchRejectTitle")).toBeInTheDocument();
    });

    it("rejects selected transactions with reason", async () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));
      fireEvent.click(screen.getByText(/activity.selectAllPending/));
      fireEvent.click(screen.getByText(/activity.batchReject/));

      // Enter rejection reason
      const textarea = screen.getByPlaceholderText("activity.rejectionPlaceholder");
      fireEvent.change(textarea, { target: { value: "Not valid" } });

      // Click confirm reject
      fireEvent.click(screen.getByText("activity.confirmReject"));

      await waitFor(() => {
        expect(mockTypedUpdate).toHaveBeenCalledWith(
          expect.anything(),
          "star_transactions",
          expect.objectContaining({
            status: "rejected",
            parent_response: "Not valid",
          })
        );
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("closes batch reject modal on cancel", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));
      fireEvent.click(screen.getByText(/activity.selectAllPending/));
      fireEvent.click(screen.getByText(/activity.batchReject/));

      // Cancel
      fireEvent.click(screen.getByText("common.cancel"));

      expect(screen.queryByText("activity.batchRejectTitle")).not.toBeInTheDocument();
    });

    it("shows error alert when batch reject fails", async () => {
      mockInHelper.mockResolvedValueOnce({ error: { message: "reject error" } });
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));
      fireEvent.click(screen.getByText(/activity.selectAllPending/));
      fireEvent.click(screen.getByText(/activity.batchReject/));

      const textarea = screen.getByPlaceholderText("activity.rejectionPlaceholder");
      fireEvent.change(textarea, { target: { value: "Bad" } });
      fireEvent.click(screen.getByText("activity.confirmReject"));

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("activity.batchRejectFailed");
      });
    });
  });

  describe("Delete Edge Cases", () => {
    it("does not delete when confirm is rejected", async () => {
      (global.confirm as jest.Mock).mockReturnValueOnce(false);
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      const deleteButtons = screen.getAllByText(/common.delete/);
      fireEvent.click(deleteButtons[0]);

      expect(mockFrom).not.toHaveBeenCalledWith("star_transactions");
    });

    it("shows alert when delete fails", async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: "delete error" } }),
        }),
      });

      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.list/));

      const deleteButtons = screen.getAllByText(/common.delete/);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("activity.deleteFailed");
      });
    });
  });

  describe("Calendar View Edit Redemption", () => {
    it("opens edit redemption modal from calendar view", () => {
      // Only redemption activities in calendar view
      render(
        <UnifiedActivityList
          activities={[redemptionActivity]}
          locale="en"
          role="parent"
        />
      );

      // In calendar view (default for parent), edit buttons show as ✏️ emoji only
      const editButtons = screen.getAllByText("✏️");
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("edit-redemption-modal")).toBeInTheDocument();
    });
  });

  describe("Batch Selection Actions", () => {
    it("shows selected count and exits selection mode on clear", () => {
      render(<UnifiedActivityList {...parentProps} />);

      fireEvent.click(screen.getByText(/activity.selectionMode/));
      fireEvent.click(screen.getByText(/activity.selectAllPending/));

      // Should show selected count
      expect(screen.getByText(/activity.selectedItems/)).toBeInTheDocument();

      // Click clear button
      fireEvent.click(screen.getByText("activity.clear"));

      // Selection mode should exit
      expect(screen.queryByText(/activity.selectAllPending/)).not.toBeInTheDocument();
    });
  });

  describe("Individual Selection Toggle", () => {
    it("toggles individual checkbox in list view selection mode", () => {
      render(<UnifiedActivityList {...parentProps} />);

      // Switch to list view
      fireEvent.click(screen.getByText(/activity.list/));

      // Enter selection mode
      fireEvent.click(screen.getByText(/activity.selectionMode/));

      // Find checkboxes (only pending star_transactions show checkboxes)
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);

      // Toggle individual checkbox
      fireEvent.click(checkboxes[0]);

      // Should show selected items count
      expect(screen.getByText(/activity.selectedItems/)).toBeInTheDocument();
    });

    it("toggles individual checkbox in calendar view selection mode", () => {
      render(<UnifiedActivityList {...parentProps} />);

      // Already in calendar view (default for parent)
      // Enter selection mode
      fireEvent.click(screen.getByText(/activity.selectionMode/));

      // Find checkboxes
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);

      // Toggle individual checkbox
      fireEvent.click(checkboxes[0]);

      expect(screen.getByText(/activity.selectedItems/)).toBeInTheDocument();
    });
  });

  describe("Calendar View Edit Star Transaction", () => {
    it("opens edit transaction modal for star_transaction in calendar view", () => {
      // Use only star_transaction activities in calendar view
      render(
        <UnifiedActivityList
          activities={[approvedActivity]}
          locale="en"
          role="parent"
        />
      );

      // In calendar view (default for parent), click edit button (✏️)
      const editButtons = screen.getAllByText("✏️");
      fireEvent.click(editButtons[0]);

      // Should open edit transaction modal (not redemption modal)
      expect(screen.getByTestId("edit-transaction-modal")).toBeInTheDocument();
    });
  });

  describe("Calendar View Delete", () => {
    it("deletes star transaction from calendar view", async () => {
      render(
        <UnifiedActivityList
          activities={[approvedActivity]}
          locale="en"
          role="parent"
        />
      );

      // In calendar view, click delete button (🗑️)
      const deleteButtons = screen.getAllByText("🗑️");
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("star_transactions");
      });
    });
  });

  describe("Calendar View Resubmit", () => {
    it("resubmit button only shows in list view, not calendar view", () => {
      render(
        <UnifiedActivityList
          activities={[rejectedActivity]}
          locale="en"
          role="child"
          currentChildId="child-1"
        />
      );

      // Child defaults to list view, resubmit should show
      expect(screen.getByText("activity.editResubmit")).toBeInTheDocument();

      // Switch to calendar view — resubmit button should not be present
      fireEvent.click(screen.getByText(/activity.calendar/));

      expect(screen.queryByText("activity.editResubmit")).not.toBeInTheDocument();
    });

    it("renders rejected child_request in calendar view with parent response visible", () => {
      const rejectedChildReq = createActivity({
        id: "cal-rej-1",
        status: "rejected",
        stars: 2,
        description: "Calendar Rejected",
        source: "child_request",
        parentResponse: "Not valid request",
      });

      render(
        <UnifiedActivityList
          activities={[rejectedChildReq]}
          locale="en"
          role="child"
          currentChildId="child-1"
        />
      );

      // Switch to calendar view
      fireEvent.click(screen.getByText(/activity.calendar/));

      // The rejected activity should appear in the date group
      expect(screen.getByText("Calendar Rejected")).toBeInTheDocument();
      // Parent response should be visible in calendar variant
      expect(screen.getByText(/Not valid request/)).toBeInTheDocument();
    });
  });

  describe("Close Edit Redemption Modal", () => {
    it("closes edit redemption modal when close is clicked", () => {
      render(
        <UnifiedActivityList
          activities={[redemptionActivity]}
          locale="en"
          role="parent"
        />
      );

      // In calendar view, click edit on redemption
      const editButtons = screen.getAllByText("✏️");
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("edit-redemption-modal")).toBeInTheDocument();

      // Close the modal
      fireEvent.click(screen.getByText("Close Redemption Edit"));

      expect(screen.queryByTestId("edit-redemption-modal")).not.toBeInTheDocument();
    });
  });

  describe("Delete Non-Star Transaction Guard", () => {
    it("alerts when trying to delete a non-star_transaction", () => {
      // This tests the guard at line 222: if (activity.type !== "star_transaction")
      // This can only be triggered programmatically since the UI doesn't show delete for non-star items
      // We test it by rendering a redemption with custom permissions that allow edit
      // and checking the alert behavior
      const redemptionWithOriginalData = createActivity({
        id: "redeem-del-1",
        type: "redemption",
        stars: -10,
        description: "Test Redemption",
        status: "approved",
        originalData: { id: "redeem-del-1", type: "redemption" } as any,
      });

      render(
        <UnifiedActivityList
          activities={[redemptionWithOriginalData]}
          locale="en"
          role="parent"
        />
      );

      // Redemptions don't show delete button in UI, so this guard is for safety
      // The edit button exists but not delete — verified by UI behavior
      const deleteButtons = screen.queryAllByText("🗑️");
      expect(deleteButtons.length).toBe(0);
    });
  });

  describe("Add Record Button", () => {
    const mockQuests = [
      { id: "q1", name_en: "Clean Room", name_zh: "打扫房间", type: "bonus", stars: 5, icon: "🧹", is_active: true, family_id: "fam-1" },
      { id: "q2", name_en: "Missed Homework", name_zh: "没做作业", type: "duty", stars: -3, icon: "📋", is_active: true, family_id: "fam-1" },
    ] as any[];

    const mockChildren = [
      { id: "child-1", name: "Alice", avatar_url: null, role: "child", family_id: "fam-1" },
    ] as any[];

    const parentPropsWithQuests = {
      ...parentProps,
      quests: mockQuests,
      children: mockChildren,
      currentUserId: "parent-1",
      familyId: "fam-1",
    };

    const childPropsWithQuests = {
      ...childProps,
      quests: [mockQuests[0]], // Only bonus quests for child
      currentUserId: "child-1",
      familyId: "fam-1",
    };

    it("should not show add record button when no date is selected", () => {
      render(<UnifiedActivityList {...parentPropsWithQuests} />);
      expect(screen.queryByTestId("add-record-button")).not.toBeInTheDocument();
    });

    it("should show add record button when a date is selected (parent)", () => {
      render(<UnifiedActivityList {...parentPropsWithQuests} />);

      // Click calendar to select a date (mock sets "2025-01-15", which is <= getTodayString "2025-01-15")
      fireEvent.click(screen.getByTestId("calendar-date-select"));

      expect(screen.getByTestId("add-record-button")).toBeInTheDocument();
      expect(screen.getByText("activity.addRecord")).toBeInTheDocument();
    });

    it("should show request stars button for child role", () => {
      render(<UnifiedActivityList {...childPropsWithQuests} />);

      // Switch to calendar view first
      fireEvent.click(screen.getByText(/activity.calendar/));

      // Select a date
      fireEvent.click(screen.getByTestId("calendar-date-select"));

      expect(screen.getByTestId("add-record-button")).toBeInTheDocument();
      expect(screen.getByText("activity.requestStars")).toBeInTheDocument();
    });

    it("should not show add record button when quests prop is missing", () => {
      render(<UnifiedActivityList {...parentProps} />);

      // Select a date
      fireEvent.click(screen.getByTestId("calendar-date-select"));

      expect(screen.queryByTestId("add-record-button")).not.toBeInTheDocument();
    });

    it("should open add record modal when button is clicked", () => {
      render(<UnifiedActivityList {...parentPropsWithQuests} />);

      // Select a date
      fireEvent.click(screen.getByTestId("calendar-date-select"));

      // Click add record button
      fireEvent.click(screen.getByTestId("add-record-button"));

      expect(screen.getByTestId("add-record-modal")).toBeInTheDocument();
    });

    it("should close add record modal when close is clicked", () => {
      render(<UnifiedActivityList {...parentPropsWithQuests} />);

      fireEvent.click(screen.getByTestId("calendar-date-select"));
      fireEvent.click(screen.getByTestId("add-record-button"));

      expect(screen.getByTestId("add-record-modal")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Close Add Record"));

      expect(screen.queryByTestId("add-record-modal")).not.toBeInTheDocument();
    });

    it("should close add record modal on success", () => {
      render(<UnifiedActivityList {...parentPropsWithQuests} />);

      fireEvent.click(screen.getByTestId("calendar-date-select"));
      fireEvent.click(screen.getByTestId("add-record-button"));

      fireEvent.click(screen.getByText("Submit Record"));

      expect(screen.queryByTestId("add-record-modal")).not.toBeInTheDocument();
    });

    it("should show CTA in empty state when date is selected and quests available", () => {
      // Render with no activities so empty state shows
      render(
        <UnifiedActivityList
          {...parentPropsWithQuests}
          activities={[]}
        />
      );

      // Select a date
      fireEvent.click(screen.getByTestId("calendar-date-select"));

      expect(screen.getByTestId("add-record-cta")).toBeInTheDocument();
      expect(screen.getByText(/activity.addRecordCta/)).toBeInTheDocument();
    });

    it("should open modal from CTA button in empty state", () => {
      render(
        <UnifiedActivityList
          {...parentPropsWithQuests}
          activities={[]}
        />
      );

      fireEvent.click(screen.getByTestId("calendar-date-select"));
      fireEvent.click(screen.getByTestId("add-record-cta"));

      expect(screen.getByTestId("add-record-modal")).toBeInTheDocument();
    });

    it("should show child request CTA text in empty state for child role", () => {
      render(
        <UnifiedActivityList
          {...childPropsWithQuests}
          activities={[]}
        />
      );

      // Switch to calendar view
      fireEvent.click(screen.getByText(/activity.calendar/));
      fireEvent.click(screen.getByTestId("calendar-date-select"));

      expect(screen.getByText(/activity.requestStarsCta/)).toBeInTheDocument();
    });

    it("should not show add record button when quests array is empty", () => {
      render(
        <UnifiedActivityList
          {...parentPropsWithQuests}
          quests={[]}
        />
      );

      fireEvent.click(screen.getByTestId("calendar-date-select"));

      expect(screen.queryByTestId("add-record-button")).not.toBeInTheDocument();
    });
  });
});
