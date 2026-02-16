"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type {
  ActivityFilterType,
  ActivityStatusFilter,
  ActivityPermissions,
} from "@/types/activity";

export interface ActivityFilterBarProps {
  // Filter state
  filterType: ActivityFilterType;
  setFilterType: (type: ActivityFilterType) => void;
  statusFilter: ActivityStatusFilter;
  setStatusFilter: (status: ActivityStatusFilter) => void;
  filterDate: string;
  setFilterDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  // View
  viewMode: "list" | "calendar";
  setViewMode: (mode: "list" | "calendar") => void;
  // Stats & counts
  stats: { all: number; approved: number; pending: number; rejected: number };
  displayedCount: number;
  totalCount: number;
  // Permissions
  permissions: ActivityPermissions;
  // Batch
  pendingCount: number;
  selectionMode: boolean;
  setSelectionMode: (mode: boolean) => void;
  selectedCount: number;
  onSelectAll: () => void;
}

function countActiveFilters(
  filterType: ActivityFilterType,
  statusFilter: ActivityStatusFilter,
  filterDate: string,
  startDate: string,
  endDate: string,
): number {
  let count = 0;
  if (filterType !== "all") count++;
  if (statusFilter !== "all") count++;
  if (filterDate) count++;
  if (startDate) count++;
  if (endDate) count++;
  return count;
}

export default function ActivityFilterBar({
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
  hasActiveFilters,
  clearFilters,
  viewMode,
  setViewMode,
  stats,
  displayedCount,
  totalCount,
  permissions,
  pendingCount,
  selectionMode,
  setSelectionMode,
  selectedCount,
  onSelectAll,
}: ActivityFilterBarProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = countActiveFilters(
    filterType,
    statusFilter,
    filterDate,
    startDate,
    endDate,
  );

  return (
    <div className="dark-card rounded-lg shadow-md p-6 space-y-4">
      {/* Header with view mode toggle — always visible, acts as collapse toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-xl font-bold hover:text-slate-200 transition"
          data-testid="filter-toggle"
        >
          <span>{t("activity.filters")}</span>
          <span className="text-base" aria-hidden="true">
            {isExpanded ? "\u25B2" : "\u25BC"}
          </span>
          {!isExpanded && hasActiveFilters && (
            <span
              className="ml-2 text-xs font-medium bg-secondary text-white px-2 py-0.5 rounded-full"
              data-testid="active-filter-badge"
            >
              {t("activity.activeFilters", { count: activeFilterCount })}
            </span>
          )}
        </button>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === "list"
                ? "bg-secondary text-white"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            {"\uD83D\uDCCB"} {t("activity.list")}
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === "calendar"
                ? "bg-secondary text-white"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            {"\uD83D\uDCC5"} {t("activity.calendar")}
          </button>
        </div>
      </div>

      {/* Collapsible filter content */}
      {isExpanded && (
        <div className="space-y-4" data-testid="filter-content">
          {/* Type Filter (parent only) */}
          {permissions.canFilterByType && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("activity.type")}
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: t("common.all") },
                  {
                    key: "stars",
                    label: `\u2B50 ${t("activity.starsType")}`,
                    bgActive: "bg-yellow-500",
                  },
                  {
                    key: "redemptions",
                    label: `\uD83C\uDF81 ${t("activity.redemptionsType")}`,
                    bgActive: "bg-purple-500",
                  },
                  {
                    key: "positive",
                    label: `\u2795 ${t("activity.positiveType")}`,
                    bgActive: "bg-green-500",
                  },
                  {
                    key: "negative",
                    label: `\u2796 ${t("activity.negativeType")}`,
                    bgActive: "bg-red-500",
                  },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() =>
                      setFilterType(filter.key as ActivityFilterType)
                    }
                    className={`px-4 py-2 rounded-lg transition ${
                      filterType === filter.key
                        ? `${filter.bgActive || "bg-blue-500"} text-white`
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter (both roles) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t("common.status")}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  key: "all",
                  label: t("history.allTransactions"),
                  count: stats.all,
                },
                {
                  key: "approved",
                  label: t("status.approved"),
                  count: stats.approved,
                },
                {
                  key: "pending",
                  label: t("status.pending"),
                  count: stats.pending,
                },
                {
                  key: "rejected",
                  label: t("status.rejected"),
                  count: stats.rejected,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() =>
                    setStatusFilter(tab.key as ActivityStatusFilter)
                  }
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    statusFilter === tab.key
                      ? "bg-primary text-gray-900"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 text-sm opacity-75">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Filters (Input fields - parent list view only) */}
          {viewMode === "list" && permissions.canFilterByType && (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("activity.singleDate")}
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("activity.startDate")}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setFilterDate("");
                  }}
                  className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("activity.endDate")}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setFilterDate("");
                  }}
                  className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {"\uD83D\uDD04"} {t("activity.clearFilters")}
            </button>
          )}

          {/* Batch Selection Controls (parent only) */}
          {permissions.canBatchApprove && pendingCount > 0 && (
            <div className="flex items-center space-x-3 pt-2 border-t">
              <button
                onClick={() => setSelectionMode(!selectionMode)}
                className={`px-4 py-2 rounded-lg transition font-medium ${
                  selectionMode
                    ? "bg-purple-500 text-white"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
              >
                {selectionMode ? "\u2705 " : "\u2610 "}
                {t("activity.selectionMode")}
              </button>
              {selectionMode && (
                <button
                  onClick={onSelectAll}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                >
                  {t("activity.selectAllPending", { count: pendingCount })}
                </button>
              )}
              {selectionMode && selectedCount > 0 && (
                <span className="text-sm text-slate-400">
                  {t("activity.selectedItems", { count: selectedCount })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Count — always visible */}
      <div className="text-sm text-slate-400">
        {t("activity.showingRecords", { displayed: displayedCount, total: totalCount })}
      </div>
    </div>
  );
}
