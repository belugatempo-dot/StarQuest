import { renderHook, act } from "@testing-library/react";
import { useActivityFilters } from "@/lib/hooks/useActivityFilters";
import type { UnifiedActivityItem } from "@/types/activity";

// Mock date-utils
jest.mock("@/lib/date-utils", () => ({
  toLocalDateString: (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
}));

describe("useActivityFilters", () => {
  const createActivity = (
    overrides: Partial<UnifiedActivityItem> = {}
  ): UnifiedActivityItem => ({
    id: `act-${Math.random().toString(36).substr(2, 5)}`,
    type: "star_transaction",
    childId: "child-1",
    childName: "Alice",
    childAvatar: null,
    stars: 5,
    description: "Test Quest",
    descriptionZh: null,
    icon: "⭐",
    status: "approved",
    childNote: null,
    parentResponse: null,
    source: "parent_record",
    createdAt: "2025-01-15T10:00:00Z",
    originalData: {} as any,
    questId: "quest-1",
    quests: null,
    ...overrides,
  });

  const activities = [
    createActivity({ id: "a1", stars: 5, status: "approved", type: "star_transaction" }),
    createActivity({ id: "a2", stars: 3, status: "pending", type: "star_transaction" }),
    createActivity({ id: "a3", stars: -2, status: "rejected", type: "star_transaction" }),
    createActivity({ id: "a4", stars: -10, status: "approved", type: "redemption" }),
    createActivity({ id: "a5", stars: -5, status: "approved", type: "credit_transaction" }),
  ];

  describe("initial state", () => {
    it("returns all activities when no filters are set", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      expect(result.current.filteredActivities).toHaveLength(5);
      expect(result.current.filterType).toBe("all");
      expect(result.current.statusFilter).toBe("all");
      expect(result.current.filterDate).toBe("");
      expect(result.current.startDate).toBe("");
      expect(result.current.endDate).toBe("");
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("type filtering", () => {
    it("filters by positive stars", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setFilterType("positive"));

      expect(result.current.filteredActivities.every((a) => a.stars > 0)).toBe(true);
    });

    it("filters by negative stars", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setFilterType("negative"));

      expect(result.current.filteredActivities.every((a) => a.stars < 0)).toBe(true);
    });

    it("filters by stars type", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setFilterType("stars"));

      expect(
        result.current.filteredActivities.every((a) => a.type === "star_transaction")
      ).toBe(true);
    });

    it("filters by redemptions type", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setFilterType("redemptions"));

      expect(
        result.current.filteredActivities.every((a) => a.type === "redemption")
      ).toBe(true);
    });

    it("does not apply type filter when canFilterByType is false", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: false })
      );

      act(() => result.current.setFilterType("positive"));

      // Should still return all activities
      expect(result.current.filteredActivities).toHaveLength(5);
    });
  });

  describe("status filtering", () => {
    it("filters by approved status", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setStatusFilter("approved"));

      expect(
        result.current.filteredActivities.every((a) => a.status === "approved")
      ).toBe(true);
    });

    it("filters by pending status", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setStatusFilter("pending"));

      expect(
        result.current.filteredActivities.every((a) => a.status === "pending")
      ).toBe(true);
    });

    it("filters by rejected status", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setStatusFilter("rejected"));

      expect(
        result.current.filteredActivities.every((a) => a.status === "rejected")
      ).toBe(true);
    });
  });

  describe("date filtering", () => {
    const dateActivities = [
      createActivity({ id: "d1", createdAt: "2025-01-10T10:00:00Z" }),
      createActivity({ id: "d2", createdAt: "2025-01-15T10:00:00Z" }),
      createActivity({ id: "d3", createdAt: "2025-01-20T10:00:00Z" }),
    ];

    it("filters by single date", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities: dateActivities, canFilterByType: true })
      );

      act(() => result.current.setFilterDate("2025-01-15"));

      expect(result.current.filteredActivities).toHaveLength(1);
      expect(result.current.filteredActivities[0].id).toBe("d2");
    });

    it("filters by start date only", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities: dateActivities, canFilterByType: true })
      );

      act(() => result.current.setStartDate("2025-01-15"));

      expect(result.current.filteredActivities).toHaveLength(2);
    });

    it("filters by end date only", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities: dateActivities, canFilterByType: true })
      );

      act(() => result.current.setEndDate("2025-01-15"));

      expect(result.current.filteredActivities).toHaveLength(2);
    });

    it("filters by date range", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities: dateActivities, canFilterByType: true })
      );

      act(() => {
        result.current.setStartDate("2025-01-12");
        result.current.setEndDate("2025-01-18");
      });

      expect(result.current.filteredActivities).toHaveLength(1);
      expect(result.current.filteredActivities[0].id).toBe("d2");
    });
  });

  describe("combined filtering", () => {
    it("applies type + status filters together", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => {
        result.current.setFilterType("stars");
        result.current.setStatusFilter("approved");
      });

      expect(
        result.current.filteredActivities.every(
          (a) => a.type === "star_transaction" && a.status === "approved"
        )
      ).toBe(true);
    });
  });

  describe("clearFilters", () => {
    it("resets all filters to defaults", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => {
        result.current.setFilterType("positive");
        result.current.setStatusFilter("pending");
        result.current.setFilterDate("2025-01-15");
        result.current.setStartDate("2025-01-10");
        result.current.setEndDate("2025-01-20");
      });

      act(() => result.current.clearFilters());

      expect(result.current.filterType).toBe("all");
      expect(result.current.statusFilter).toBe("all");
      expect(result.current.filterDate).toBe("");
      expect(result.current.startDate).toBe("");
      expect(result.current.endDate).toBe("");
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("hasActiveFilters", () => {
    it("returns true when type filter is active", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setFilterType("positive"));

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when status filter is active", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setStatusFilter("pending"));

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when filter date is set", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setFilterDate("2025-01-15"));

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when start date is set", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setStartDate("2025-01-10"));

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when end date is set", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      act(() => result.current.setEndDate("2025-01-20"));

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns false when all filters are default", () => {
      const { result } = renderHook(() =>
        useActivityFilters({ activities, canFilterByType: true })
      );

      expect(result.current.hasActiveFilters).toBe(false);
    });
  });
});
