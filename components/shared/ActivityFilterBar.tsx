"use client";

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

  return (
    <div className="dark-card rounded-lg shadow-md p-6 space-y-4">
      {/* Header with view mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {t("activity.filters")}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === "list"
                ? "bg-secondary text-white"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            📋 {t("activity.list")}
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === "calendar"
                ? "bg-secondary text-white"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            📅 {t("activity.calendar")}
          </button>
        </div>
      </div>

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
                label: `⭐ ${t("activity.starsType")}`,
                bgActive: "bg-yellow-500",
              },
              {
                key: "redemptions",
                label: `🎁 ${t("activity.redemptionsType")}`,
                bgActive: "bg-purple-500",
              },
              {
                key: "positive",
                label: `➕ ${t("activity.positiveType")}`,
                bgActive: "bg-green-500",
              },
              {
                key: "negative",
                label: `➖ ${t("activity.negativeType")}`,
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
          🔄 {t("activity.clearFilters")}
        </button>
      )}

      {/* Results Count */}
      <div className="text-sm text-slate-400">
        {t("activity.showingRecords", { displayed: displayedCount, total: totalCount })}
      </div>

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
            {selectionMode ? "✅ " : "☐ "}
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
  );
}
