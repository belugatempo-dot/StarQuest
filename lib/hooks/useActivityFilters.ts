"use client";

import { useState, useMemo } from "react";
import { toLocalDateString } from "@/lib/date-utils";
import type {
  UnifiedActivityItem,
  ActivityFilterType,
  ActivityStatusFilter,
} from "@/types/activity";

interface UseActivityFiltersOptions {
  activities: UnifiedActivityItem[];
  canFilterByType: boolean;
}

export function useActivityFilters({
  activities,
  canFilterByType,
}: UseActivityFiltersOptions) {
  const [filterType, setFilterType] = useState<ActivityFilterType>("all");
  const [statusFilter, setStatusFilter] = useState<ActivityStatusFilter>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    // Filter by type (parent only)
    if (canFilterByType) {
      if (filterType === "positive") {
        filtered = filtered.filter((a) => a.stars > 0);
      } else if (filterType === "negative") {
        filtered = filtered.filter((a) => a.stars < 0);
      } else if (filterType === "stars") {
        filtered = filtered.filter((a) => a.type === "star_transaction");
      } else if (filterType === "redemptions") {
        filtered = filtered.filter((a) => a.type === "redemption");
      }
    }

    // Filter by status (both roles)
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // Filter by single date
    if (filterDate) {
      filtered = filtered.filter((a) => {
        const date = new Date(a.createdAt);
        const activityDate = toLocalDateString(date);
        return activityDate === filterDate;
      });
    }

    // Filter by date range (parent only in list view)
    if (startDate && endDate) {
      filtered = filtered.filter((a) => {
        const date = new Date(a.createdAt);
        const activityDate = toLocalDateString(date);
        return activityDate >= startDate && activityDate <= endDate;
      });
    } else if (startDate) {
      filtered = filtered.filter((a) => {
        const date = new Date(a.createdAt);
        const activityDate = toLocalDateString(date);
        return activityDate >= startDate;
      });
    } else if (endDate) {
      filtered = filtered.filter((a) => {
        const date = new Date(a.createdAt);
        const activityDate = toLocalDateString(date);
        return activityDate <= endDate;
      });
    }

    return filtered;
  }, [activities, filterType, statusFilter, filterDate, startDate, endDate, canFilterByType]);

  const hasActiveFilters =
    filterType !== "all" ||
    statusFilter !== "all" ||
    filterDate !== "" ||
    startDate !== "" ||
    endDate !== "";

  const clearFilters = () => {
    setFilterType("all");
    setStatusFilter("all");
    setFilterDate("");
    setStartDate("");
    setEndDate("");
  };

  return {
    filterType,
    setFilterType,
    statusFilter,
    setStatusFilter,
    filterDate,
    setFilterDate,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filteredActivities,
    hasActiveFilters,
    clearFilters,
  };
}
