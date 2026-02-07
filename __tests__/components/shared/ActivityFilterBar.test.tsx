import { render, screen, fireEvent } from "@testing-library/react";
import ActivityFilterBar from "@/components/shared/ActivityFilterBar";
import type { ActivityFilterType, ActivityStatusFilter } from "@/types/activity";
import { getPermissions } from "@/types/activity";

describe("ActivityFilterBar", () => {
  const parentPermissions = getPermissions("parent");
  const childPermissions = getPermissions("child");

  const stats = { all: 10, approved: 6, pending: 3, rejected: 1 };

  const createProps = (overrides: Record<string, any> = {}) => ({
    // Filter state
    filterType: "all" as ActivityFilterType,
    setFilterType: jest.fn(),
    statusFilter: "all" as ActivityStatusFilter,
    setStatusFilter: jest.fn(),
    filterDate: "",
    setFilterDate: jest.fn(),
    startDate: "",
    setStartDate: jest.fn(),
    endDate: "",
    setEndDate: jest.fn(),
    hasActiveFilters: false,
    clearFilters: jest.fn(),
    // View
    viewMode: "list" as "list" | "calendar",
    setViewMode: jest.fn(),
    // Stats & counts
    stats,
    displayedCount: 10,
    totalCount: 10,
    // Permissions
    permissions: parentPermissions,
    // Batch
    pendingCount: 3,
    selectionMode: false,
    setSelectionMode: jest.fn(),
    selectedCount: 0,
    onSelectAll: jest.fn(),
    ...overrides,
  });

  describe("View mode toggle", () => {
    it("renders list and calendar toggle buttons", () => {
      render(<ActivityFilterBar {...createProps()} />);
      expect(screen.getByText(/activity.list/)).toBeInTheDocument();
      expect(screen.getByText(/activity.calendar/)).toBeInTheDocument();
    });

    it("applies active class to current view mode button", () => {
      render(<ActivityFilterBar {...createProps({ viewMode: "calendar" })} />);
      const calendarBtn = screen.getByText(/activity.calendar/).closest("button");
      expect(calendarBtn?.className).toContain("bg-secondary");
    });

    it("calls setViewMode when list button clicked", () => {
      const setViewMode = jest.fn();
      render(<ActivityFilterBar {...createProps({ setViewMode, viewMode: "calendar" })} />);
      fireEvent.click(screen.getByText(/activity.list/));
      expect(setViewMode).toHaveBeenCalledWith("list");
    });

    it("calls setViewMode when calendar button clicked", () => {
      const setViewMode = jest.fn();
      render(<ActivityFilterBar {...createProps({ setViewMode, viewMode: "list" })} />);
      fireEvent.click(screen.getByText(/activity.calendar/));
      expect(setViewMode).toHaveBeenCalledWith("calendar");
    });
  });

  describe("Type filter (parent only)", () => {
    it("renders type filter buttons for parent", () => {
      render(<ActivityFilterBar {...createProps()} />);
      expect(screen.getByText(/activity.type/)).toBeInTheDocument();
      expect(screen.getByText(/activity.starsType/)).toBeInTheDocument();
      expect(screen.getByText(/activity.redemptionsType/)).toBeInTheDocument();
      expect(screen.getByText(/activity.positiveType/)).toBeInTheDocument();
      expect(screen.getByText(/activity.negativeType/)).toBeInTheDocument();
    });

    it("does not render type filter for child", () => {
      render(<ActivityFilterBar {...createProps({ permissions: childPermissions })} />);
      expect(screen.queryByText(/activity.type/)).not.toBeInTheDocument();
    });

    it("calls setFilterType when type button clicked", () => {
      const setFilterType = jest.fn();
      render(<ActivityFilterBar {...createProps({ setFilterType })} />);
      fireEvent.click(screen.getByText(/activity.starsType/));
      expect(setFilterType).toHaveBeenCalledWith("stars");
    });

    it("highlights the active type filter", () => {
      render(<ActivityFilterBar {...createProps({ filterType: "stars" })} />);
      const starsBtn = screen.getByText(/activity.starsType/).closest("button");
      expect(starsBtn?.className).toContain("text-white");
    });
  });

  describe("Status filter", () => {
    it("renders status filter buttons with counts", () => {
      render(<ActivityFilterBar {...createProps()} />);
      expect(screen.getByText(/history.allTransactions/)).toBeInTheDocument();
      expect(screen.getByText(/status.approved/)).toBeInTheDocument();
      expect(screen.getByText(/status.pending/)).toBeInTheDocument();
      expect(screen.getByText(/status.rejected/)).toBeInTheDocument();
    });

    it("renders status counts", () => {
      render(<ActivityFilterBar {...createProps()} />);
      expect(screen.getByText("(10)")).toBeInTheDocument();
      expect(screen.getByText("(6)")).toBeInTheDocument();
      expect(screen.getByText("(3)")).toBeInTheDocument();
      expect(screen.getByText("(1)")).toBeInTheDocument();
    });

    it("calls setStatusFilter when status button clicked", () => {
      const setStatusFilter = jest.fn();
      render(<ActivityFilterBar {...createProps({ setStatusFilter })} />);
      fireEvent.click(screen.getByText(/status.pending/));
      expect(setStatusFilter).toHaveBeenCalledWith("pending");
    });

    it("highlights the active status filter", () => {
      render(<ActivityFilterBar {...createProps({ statusFilter: "pending" })} />);
      const pendingBtn = screen.getByText(/status.pending/).closest("button");
      expect(pendingBtn?.className).toContain("bg-primary");
    });

    it("renders for child too", () => {
      render(<ActivityFilterBar {...createProps({ permissions: childPermissions })} />);
      expect(screen.getByText(/status.approved/)).toBeInTheDocument();
    });
  });

  describe("Date filters", () => {
    it("renders date inputs in parent list view", () => {
      render(<ActivityFilterBar {...createProps({ viewMode: "list" })} />);
      expect(screen.getByText(/activity.singleDate/)).toBeInTheDocument();
      expect(screen.getByText(/activity.startDate/)).toBeInTheDocument();
      expect(screen.getByText(/activity.endDate/)).toBeInTheDocument();
    });

    it("does not render date inputs in calendar view", () => {
      render(<ActivityFilterBar {...createProps({ viewMode: "calendar" })} />);
      expect(screen.queryByText(/activity.singleDate/)).not.toBeInTheDocument();
    });

    it("does not render date inputs for child", () => {
      render(<ActivityFilterBar {...createProps({ permissions: childPermissions, viewMode: "list" })} />);
      expect(screen.queryByText(/activity.singleDate/)).not.toBeInTheDocument();
    });

    it("calls setFilterDate when single date changes", () => {
      const setFilterDate = jest.fn();
      const setStartDate = jest.fn();
      const setEndDate = jest.fn();
      render(<ActivityFilterBar {...createProps({ setFilterDate, setStartDate, setEndDate })} />);

      const dateInputs = screen.getAllByDisplayValue("");
      // First date input is the single date
      fireEvent.change(dateInputs[0], { target: { value: "2025-01-15" } });
      expect(setFilterDate).toHaveBeenCalledWith("2025-01-15");
      expect(setStartDate).toHaveBeenCalledWith("");
      expect(setEndDate).toHaveBeenCalledWith("");
    });

    it("calls setStartDate when start date changes", () => {
      const setStartDate = jest.fn();
      const setFilterDate = jest.fn();
      render(<ActivityFilterBar {...createProps({ setStartDate, setFilterDate })} />);

      const dateInputs = screen.getAllByDisplayValue("");
      // Second date input is start date
      fireEvent.change(dateInputs[1], { target: { value: "2025-01-10" } });
      expect(setStartDate).toHaveBeenCalledWith("2025-01-10");
      expect(setFilterDate).toHaveBeenCalledWith("");
    });

    it("calls setEndDate when end date changes", () => {
      const setEndDate = jest.fn();
      const setFilterDate = jest.fn();
      render(<ActivityFilterBar {...createProps({ setEndDate, setFilterDate })} />);

      const dateInputs = screen.getAllByDisplayValue("");
      // Third date input is end date
      fireEvent.change(dateInputs[2], { target: { value: "2025-01-20" } });
      expect(setEndDate).toHaveBeenCalledWith("2025-01-20");
      expect(setFilterDate).toHaveBeenCalledWith("");
    });
  });

  describe("Clear filters", () => {
    it("shows clear button when filters are active", () => {
      render(<ActivityFilterBar {...createProps({ hasActiveFilters: true })} />);
      expect(screen.getByText(/activity.clearFilters/)).toBeInTheDocument();
    });

    it("does not show clear button when no active filters", () => {
      render(<ActivityFilterBar {...createProps({ hasActiveFilters: false })} />);
      expect(screen.queryByText(/activity.clearFilters/)).not.toBeInTheDocument();
    });

    it("calls clearFilters on click", () => {
      const clearFilters = jest.fn();
      render(<ActivityFilterBar {...createProps({ hasActiveFilters: true, clearFilters })} />);
      fireEvent.click(screen.getByText(/activity.clearFilters/));
      expect(clearFilters).toHaveBeenCalled();
    });
  });

  describe("Results count", () => {
    it("shows record counts", () => {
      render(<ActivityFilterBar {...createProps({ displayedCount: 5, totalCount: 20 })} />);
      expect(screen.getByText(/activity.showingRecords/)).toBeInTheDocument();
    });
  });

  describe("Batch selection controls", () => {
    it("shows selection mode toggle for parent with pending items", () => {
      render(<ActivityFilterBar {...createProps({ pendingCount: 3 })} />);
      expect(screen.getByText(/activity.selectionMode/)).toBeInTheDocument();
    });

    it("does not show batch controls when no pending items", () => {
      render(<ActivityFilterBar {...createProps({ pendingCount: 0 })} />);
      expect(screen.queryByText(/activity.selectionMode/)).not.toBeInTheDocument();
    });

    it("does not show batch controls for child", () => {
      render(<ActivityFilterBar {...createProps({ permissions: childPermissions, pendingCount: 3 })} />);
      expect(screen.queryByText(/activity.selectionMode/)).not.toBeInTheDocument();
    });

    it("toggles selection mode on click", () => {
      const setSelectionMode = jest.fn();
      render(<ActivityFilterBar {...createProps({ setSelectionMode, selectionMode: false })} />);
      fireEvent.click(screen.getByText(/activity.selectionMode/));
      expect(setSelectionMode).toHaveBeenCalledWith(true);
    });

    it("shows select all button in selection mode", () => {
      render(<ActivityFilterBar {...createProps({ selectionMode: true, pendingCount: 3 })} />);
      expect(screen.getByText(/activity.selectAllPending/)).toBeInTheDocument();
    });

    it("calls onSelectAll when select all clicked", () => {
      const onSelectAll = jest.fn();
      render(<ActivityFilterBar {...createProps({ selectionMode: true, pendingCount: 3, onSelectAll })} />);
      fireEvent.click(screen.getByText(/activity.selectAllPending/));
      expect(onSelectAll).toHaveBeenCalled();
    });

    it("shows selected count when items are selected", () => {
      render(<ActivityFilterBar {...createProps({ selectionMode: true, selectedCount: 2, pendingCount: 3 })} />);
      expect(screen.getByText(/activity.selectedItems/)).toBeInTheDocument();
    });

    it("does not show selected count when no items selected", () => {
      render(<ActivityFilterBar {...createProps({ selectionMode: true, selectedCount: 0, pendingCount: 3 })} />);
      expect(screen.queryByText(/activity.selectedItems/)).not.toBeInTheDocument();
    });

    it("applies active class when selection mode is on", () => {
      render(<ActivityFilterBar {...createProps({ selectionMode: true, pendingCount: 3 })} />);
      const btn = screen.getByText(/activity.selectionMode/).closest("button");
      expect(btn?.className).toContain("bg-purple-500");
    });
  });
});
