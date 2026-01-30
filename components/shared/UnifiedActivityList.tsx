"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CalendarView from "@/components/admin/CalendarView";
import EditTransactionModal from "@/components/admin/EditTransactionModal";
import EditRedemptionModal from "@/components/admin/EditRedemptionModal";
import ResubmitRequestModal from "@/components/child/ResubmitRequestModal";
import type {
  UnifiedActivityItem,
  UnifiedActivityListProps,
  ActivityFilterType,
  ActivityStatusFilter,
} from "@/types/activity";
import { getPermissions } from "@/types/activity";
import {
  getActivityDescription,
  getStatusBadge,
  getTypeBadge,
  formatActivityDate,
  formatDateShort,
  getDailyTotal,
  groupActivitiesByDate,
  calculateActivityStats,
} from "@/lib/activity-utils";

export default function UnifiedActivityList({
  activities,
  locale,
  role,
  currentChildId,
  permissions: customPermissions,
}: UnifiedActivityListProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  // Use custom permissions or derive from role
  const permissions = customPermissions || getPermissions(role);

  // View state
  const [viewMode, setViewMode] = useState<"list" | "calendar">(
    role === "parent" ? "calendar" : "list"
  );

  // Filter state - different defaults based on role
  const [filterType, setFilterType] = useState<ActivityFilterType>("all");
  const [statusFilter, setStatusFilter] = useState<ActivityStatusFilter>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination state (child only)
  const [showCount, setShowCount] = useState(20);

  // Edit/Delete state (parent only)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(
    null
  );
  const [editingRedemption, setEditingRedemption] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Resubmit state (child only)
  const [resubmitTransaction, setResubmitTransaction] = useState<any | null>(
    null
  );

  // Batch selection state (parent only)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Calculate stats
  const stats = useMemo(
    () => calculateActivityStats(activities),
    [activities]
  );

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    // Filter by type (parent only)
    if (permissions.canFilterByType) {
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
        const activityDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return activityDate === filterDate;
      });
    }

    // Filter by date range (parent only in list view)
    if (startDate && endDate) {
      filtered = filtered.filter((a) => {
        const date = new Date(a.createdAt);
        const activityDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return activityDate >= startDate && activityDate <= endDate;
      });
    } else if (startDate) {
      filtered = filtered.filter((a) => {
        const date = new Date(a.createdAt);
        const activityDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return activityDate >= startDate;
      });
    } else if (endDate) {
      filtered = filtered.filter((a) => {
        const date = new Date(a.createdAt);
        const activityDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return activityDate <= endDate;
      });
    }

    return filtered;
  }, [
    activities,
    filterType,
    statusFilter,
    filterDate,
    startDate,
    endDate,
    permissions.canFilterByType,
  ]);

  // Apply pagination (child only)
  const displayedActivities = permissions.usePagination
    ? filteredActivities.slice(0, showCount)
    : filteredActivities;
  const hasMore =
    permissions.usePagination && filteredActivities.length > showCount;

  // Group by date for calendar view
  const groupedByDate = useMemo(
    () => groupActivitiesByDate(filteredActivities),
    [filteredActivities]
  );

  // Get pending star transactions (parent batch operations)
  const pendingTransactions = useMemo(
    () =>
      filteredActivities.filter(
        (a) => a.type === "star_transaction" && a.status === "pending"
      ),
    [filteredActivities]
  );

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

  // Selection handlers (parent only)
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    setSelectedIds(new Set(pendingTransactions.map((t) => t.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  // Batch approve handler (parent only)
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;

    const confirmMessage =
      locale === "zh-CN"
        ? `确定要批准这 ${selectedIds.size} 条待审批记录吗？`
        : `Approve ${selectedIds.size} pending requests?`;

    if (!confirm(confirmMessage)) return;

    setIsBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await (supabase.from("star_transactions")
        .update as any)({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      }).in("id", ids);

      if (error) throw error;

      clearSelection();
      router.refresh();
    } catch (err) {
      console.error("Batch approve error:", err);
      alert(locale === "zh-CN" ? "批量批准失败" : "Batch approve failed");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch reject handler (parent only)
  const handleBatchReject = async () => {
    if (selectedIds.size === 0 || !batchRejectReason.trim()) return;

    setIsBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await (supabase.from("star_transactions")
        .update as any)({
        status: "rejected",
        parent_response: batchRejectReason.trim(),
        reviewed_at: new Date().toISOString(),
      }).in("id", ids);

      if (error) throw error;

      setShowBatchRejectModal(false);
      setBatchRejectReason("");
      clearSelection();
      router.refresh();
    } catch (err) {
      console.error("Batch reject error:", err);
      alert(locale === "zh-CN" ? "批量拒绝失败" : "Batch reject failed");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Delete handler (parent only)
  const handleDelete = async (activity: UnifiedActivityItem) => {
    if (activity.type !== "star_transaction") {
      alert(
        locale === "zh-CN" ? "只能删除星星记录" : "Can only delete star transactions"
      );
      return;
    }

    const confirmMessage =
      locale === "zh-CN"
        ? `确定要删除这条记录吗？\n\n任务: ${getActivityDescription(activity, locale)}\n星星: ${activity.stars > 0 ? "+" : ""}${activity.stars}⭐`
        : `Are you sure you want to delete this record?\n\nQuest: ${getActivityDescription(activity, locale)}\nStars: ${activity.stars > 0 ? "+" : ""}${activity.stars}⭐`;

    if (!confirm(confirmMessage)) return;

    setDeletingId(activity.id);

    try {
      const { error } = await supabase
        .from("star_transactions")
        .delete()
        .eq("id", activity.id);

      if (error) throw error;

      router.refresh();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      alert(
        locale === "zh-CN"
          ? "删除失败，请重试"
          : "Failed to delete, please try again"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilterType("all");
    setStatusFilter("all");
    setFilterDate("");
    setStartDate("");
    setEndDate("");
  };

  // Convert activities to transaction format for CalendarView
  const transactionsForCalendar = useMemo(() => {
    return activities.map((a) => ({
      id: a.id,
      stars: a.stars,
      status: a.status,
      created_at: a.createdAt,
    }));
  }, [activities]);

  // Check if any filters are active
  const hasActiveFilters =
    filterType !== "all" ||
    statusFilter !== "all" ||
    filterDate ||
    startDate ||
    endDate;

  return (
    <div className="space-y-6">
      {/* Main Layout: Calendar + Filters */}
      <div
        className={`${viewMode === "calendar" ? "grid lg:grid-cols-2 gap-6" : ""}`}
      >
        {/* Calendar Picker - Left Side */}
        {viewMode === "calendar" && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <CalendarView
              transactions={transactionsForCalendar as any}
              locale={locale}
              selectedDate={filterDate}
              onDateSelect={(date) => {
                setFilterDate(date);
                setStartDate("");
                setEndDate("");
              }}
            />
          </div>
        )}

        {/* Filters and List - Right Side or Full Width */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            {/* Header with view mode toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {locale === "zh-CN" ? "筛选" : "Filters"}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 rounded-lg transition ${
                    viewMode === "list"
                      ? "bg-secondary text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  📋 {locale === "zh-CN" ? "列表" : "List"}
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`px-4 py-2 rounded-lg transition ${
                    viewMode === "calendar"
                      ? "bg-secondary text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  📅 {locale === "zh-CN" ? "日历" : "Calendar"}
                </button>
              </div>
            </div>

            {/* Type Filter (parent only) */}
            {permissions.canFilterByType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === "zh-CN" ? "类型" : "Type"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: locale === "zh-CN" ? "全部" : "All" },
                    {
                      key: "stars",
                      label: `⭐ ${locale === "zh-CN" ? "星星" : "Stars"}`,
                      bgActive: "bg-yellow-500",
                    },
                    {
                      key: "redemptions",
                      label: `🎁 ${locale === "zh-CN" ? "兑换" : "Redemptions"}`,
                      bgActive: "bg-purple-500",
                    },
                    {
                      key: "positive",
                      label: `➕ ${locale === "zh-CN" ? "加分" : "Positive"}`,
                      bgActive: "bg-green-500",
                    },
                    {
                      key: "negative",
                      label: `➖ ${locale === "zh-CN" ? "扣分" : "Negative"}`,
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
                          : "bg-gray-100 hover:bg-gray-200"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === "zh-CN" ? "状态" : "Status"}
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
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === "zh-CN" ? "单个日期" : "Single Date"}
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === "zh-CN" ? "开始日期" : "Start Date"}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setFilterDate("");
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === "zh-CN" ? "结束日期" : "End Date"}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setFilterDate("");
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
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
                🔄 {locale === "zh-CN" ? "清除所有筛选" : "Clear all filters"}
              </button>
            )}

            {/* Results Count */}
            <div className="text-sm text-gray-600">
              {locale === "zh-CN"
                ? `显示 ${displayedActivities.length} 条记录（共 ${activities.length} 条）`
                : `Showing ${displayedActivities.length} of ${activities.length} records`}
            </div>

            {/* Batch Selection Controls (parent only) */}
            {permissions.canBatchApprove && pendingTransactions.length > 0 && (
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
                  {locale === "zh-CN" ? "选择模式" : "Selection Mode"}
                </button>
                {selectionMode && (
                  <button
                    onClick={selectAllPending}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                  >
                    {locale === "zh-CN"
                      ? `全选待审批 (${pendingTransactions.length})`
                      : `Select All Pending (${pendingTransactions.length})`}
                  </button>
                )}
                {selectionMode && selectedIds.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {locale === "zh-CN"
                      ? `已选择 ${selectedIds.size} 项`
                      : `${selectedIds.size} selected`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {displayedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 text-lg">{t("history.emptyState")}</p>
                </div>
              ) : (
                displayedActivities.map((activity) => (
                  <ActivityItem
                    key={`${activity.type}-${activity.id}`}
                    activity={activity}
                    locale={locale}
                    permissions={permissions}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(activity.id)}
                    onToggleSelection={() => toggleSelection(activity.id)}
                    onEdit={() => {
                      if (activity.type === "redemption") {
                        setEditingRedemption(activity.originalData);
                      } else {
                        setEditingTransaction(activity.originalData);
                      }
                    }}
                    onDelete={() => handleDelete(activity)}
                    onResubmit={() => setResubmitTransaction(activity.originalData)}
                    deletingId={deletingId}
                    showChildName={permissions.canSeeAllChildren}
                    variant="list"
                  />
                ))
              )}
            </div>
          )}

          {/* Calendar View */}
          {viewMode === "calendar" && (
            <div className="space-y-4">
              {groupedByDate.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <p className="text-gray-500">
                    {locale === "zh-CN" ? "没有找到记录" : "No records found"}
                  </p>
                </div>
              ) : (
                groupedByDate.map(([date, dayActivities]) => {
                  const dailyTotal = getDailyTotal(dayActivities);
                  return (
                    <div
                      key={date}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                      {/* Date Header - Night Theme */}
                      <div className="night-date-header px-6 py-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            ✨ {formatDateShort(date, locale)}
                          </h3>
                          <p className="text-sm text-white/70">
                            {dayActivities.length}{" "}
                            {locale === "zh-CN" ? "条记录" : "records"}
                          </p>
                        </div>
                        <div
                          className={`text-2xl font-bold star-glow ${
                            dailyTotal > 0
                              ? "text-green-400"
                              : dailyTotal < 0
                                ? "text-red-400"
                                : "text-white/60"
                          }`}
                        >
                          {dailyTotal > 0 ? "+" : ""}
                          {dailyTotal} ⭐
                        </div>
                      </div>

                      {/* Activities for this date */}
                      <div className="p-6 space-y-3">
                        {dayActivities.map((activity) => (
                          <ActivityItem
                            key={`${activity.type}-${activity.id}`}
                            activity={activity}
                            locale={locale}
                            permissions={permissions}
                            selectionMode={selectionMode}
                            isSelected={selectedIds.has(activity.id)}
                            onToggleSelection={() =>
                              toggleSelection(activity.id)
                            }
                            onEdit={() => {
                              if (activity.type === "redemption") {
                                setEditingRedemption(activity.originalData);
                              } else {
                                setEditingTransaction(activity.originalData);
                              }
                            }}
                            onDelete={() => handleDelete(activity)}
                            onResubmit={() =>
                              setResubmitTransaction(activity.originalData)
                            }
                            deletingId={deletingId}
                            showChildName={permissions.canSeeAllChildren}
                            variant="calendar"
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Show More Button (child pagination) */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowCount(showCount + 20)}
                className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition"
              >
                {t("history.showMore")} (
                {filteredActivities.length - showCount}{" "}
                {t("common.all").toLowerCase()})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal (parent only - star transactions) */}
      {editingTransaction && permissions.canEdit && (
        <EditTransactionModal
          transaction={editingTransaction}
          locale={locale}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* Edit Redemption Modal (parent only) */}
      {editingRedemption && permissions.canEdit && (
        <EditRedemptionModal
          redemption={editingRedemption}
          locale={locale}
          onClose={() => setEditingRedemption(null)}
        />
      )}

      {/* Resubmit Modal (child only) */}
      {resubmitTransaction && permissions.canResubmit && (
        <ResubmitRequestModal
          transaction={resubmitTransaction}
          locale={locale}
          onClose={() => setResubmitTransaction(null)}
        />
      )}

      {/* Floating Action Bar for Batch Operations (parent only) */}
      {selectedIds.size > 0 && permissions.canBatchApprove && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-purple-300 shadow-lg p-4 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="font-medium text-purple-700">
              {locale === "zh-CN"
                ? `已选择 ${selectedIds.size} 项`
                : `${selectedIds.size} items selected`}
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBatchApprove}
                disabled={isBatchProcessing}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 font-medium"
              >
                {isBatchProcessing
                  ? locale === "zh-CN"
                    ? "处理中..."
                    : "Processing..."
                  : locale === "zh-CN"
                    ? "✅ 批量批准"
                    : "✅ Batch Approve"}
              </button>
              <button
                onClick={() => setShowBatchRejectModal(true)}
                disabled={isBatchProcessing}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 font-medium"
              >
                {locale === "zh-CN" ? "❌ 批量拒绝" : "❌ Batch Reject"}
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                {locale === "zh-CN" ? "清除" : "Clear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Reject Modal (parent only) */}
      {showBatchRejectModal && permissions.canBatchApprove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {locale === "zh-CN" ? "批量拒绝" : "Batch Reject"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {locale === "zh-CN"
                  ? `将拒绝 ${selectedIds.size} 条待审批记录`
                  : `Rejecting ${selectedIds.size} pending requests`}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === "zh-CN" ? "拒绝原因 *" : "Rejection Reason *"}
                </label>
                <textarea
                  value={batchRejectReason}
                  onChange={(e) => setBatchRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  placeholder={
                    locale === "zh-CN"
                      ? "请输入拒绝原因..."
                      : "Enter rejection reason..."
                  }
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBatchRejectModal(false);
                    setBatchRejectReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  {locale === "zh-CN" ? "取消" : "Cancel"}
                </button>
                <button
                  onClick={handleBatchReject}
                  disabled={isBatchProcessing || !batchRejectReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                >
                  {isBatchProcessing
                    ? locale === "zh-CN"
                      ? "处理中..."
                      : "Processing..."
                    : locale === "zh-CN"
                      ? "确认拒绝"
                      : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Unified sub-component for both list and calendar view items
interface ActivityItemProps {
  activity: UnifiedActivityItem;
  locale: string;
  permissions: ReturnType<typeof getPermissions>;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResubmit: () => void;
  deletingId: string | null;
  showChildName: boolean;
  variant: "list" | "calendar";
}

function ActivityItem({
  activity,
  locale,
  permissions,
  selectionMode,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  onResubmit,
  deletingId,
  showChildName,
  variant,
}: ActivityItemProps) {
  const t = useTranslations();
  const statusBadge = getStatusBadge(activity.status, locale);
  const typeBadge = getTypeBadge(activity.type, locale);

  const canSelectForBatch =
    selectionMode &&
    activity.type === "star_transaction" &&
    activity.status === "pending";

  // Stars color class
  const getStarsColorClass = () => {
    if (activity.status === "rejected") return "text-gray-400 line-through";
    if (activity.status === "pending") return "text-yellow-600";
    if (variant === "list") {
      return activity.stars > 0 ? "text-success" : "text-danger";
    }
    return activity.stars > 0 ? "text-green-600" : "text-red-600";
  };

  // Card background/border classes
  const getCardClasses = () => {
    if (variant === "list") {
      if (activity.status === "rejected") return "bg-danger/5 border-danger/20";
      if (activity.status === "pending") return "bg-warning/5 border-warning/20";
      if (activity.type === "redemption") return "border-purple-200 bg-purple-50";
      if (activity.type === "credit_transaction") return "border-blue-200 bg-blue-50";
      return "bg-gray-50 border-gray-200";
    }
    // calendar variant
    if (activity.status === "rejected") return "border-gray-300 bg-gray-50";
    if (activity.status === "pending") return "border-yellow-200 bg-yellow-50";
    if (activity.type === "redemption") return "border-purple-200 bg-purple-50";
    if (activity.type === "credit_transaction") return "border-blue-200 bg-blue-50";
    return activity.stars > 0
      ? "border-green-200 bg-green-50"
      : "border-red-200 bg-red-50";
  };

  // Selection checkbox (shared)
  const checkbox = canSelectForBatch && (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={onToggleSelection}
      className={`w-5 h-5 ${variant === "list" ? "mt-1" : ""} rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer`}
    />
  );

  // Action buttons (parent only, shared logic)
  const canShowActions = permissions.canEdit && (activity.type === "star_transaction" || activity.type === "redemption");

  const actionButtons = canShowActions && (
    <div className={variant === "list" ? "flex flex-col space-y-1 mt-2" : "flex space-x-1"}>
      <button
        onClick={onEdit}
        className={variant === "list"
          ? "px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
          : "px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"}
      >
        {variant === "list" ? `✏️ ${locale === "zh-CN" ? "编辑" : "Edit"}` : "✏️"}
      </button>
      {activity.type === "star_transaction" && (
        <button
          onClick={onDelete}
          disabled={deletingId === activity.id}
          className={variant === "list"
            ? "px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
            : "px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"}
        >
          {variant === "list" ? `🗑️ ${locale === "zh-CN" ? "删除" : "Delete"}` : "🗑️"}
        </button>
      )}
    </div>
  );

  if (variant === "calendar") {
    return (
      <div
        className={`p-4 rounded-lg border-2 ${getCardClasses()} ${isSelected ? "ring-2 ring-purple-500" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {checkbox}
            <span className="text-2xl">{activity.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">
                  {getActivityDescription(activity, locale)}
                </h4>
                {permissions.canFilterByType && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.className}`}
                  >
                    {typeBadge.icon}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {showChildName && `👤 ${activity.childName} • `}
                {new Date(activity.createdAt).toLocaleTimeString(
                  locale === "zh-CN" ? "zh-CN" : "en-US",
                  { hour: "2-digit", minute: "2-digit" }
                )}
                {" • "}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </p>
              {activity.parentResponse && (
                <p className="text-sm text-gray-600 mt-1">
                  💬 {activity.parentResponse}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`text-xl font-bold ${getStarsColorClass()}`}>
              {activity.stars > 0 ? "+" : ""}
              {activity.stars}⭐
            </div>
            {actionButtons}
          </div>
        </div>
      </div>
    );
  }

  // List variant
  return (
    <div
      className={`p-4 rounded-lg border-2 transition hover:shadow-md ${getCardClasses()} ${isSelected ? "ring-2 ring-purple-500" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {checkbox}
          <div className="text-3xl mt-1">{activity.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">
              {getActivityDescription(activity, locale)}
            </h3>
            {permissions.canFilterByType && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.className}`}
              >
                {typeBadge.icon} {typeBadge.label}
              </span>
            )}
            <p className="text-sm text-gray-500">
              {formatActivityDate(activity.createdAt, locale)}
            </p>

            {/* Source (child view) */}
            {!permissions.canFilterByType && activity.source && (
              <p className="text-xs text-gray-600 mt-1">
                {activity.source === "parent_record"
                  ? t("history.parentRecorded")
                  : t("history.youRequested")}
              </p>
            )}

            {/* Child Note */}
            {activity.childNote && (
              <p className="text-sm text-gray-700 mt-2 italic">
                &quot;{activity.childNote}&quot;
              </p>
            )}

            {/* Parent Response (for rejected) */}
            {activity.status === "rejected" && activity.parentResponse && (
              <div className="mt-2 p-2 bg-danger/10 rounded border border-danger/20">
                <p className="text-xs font-semibold text-danger">
                  {t("history.rejectionReason")}:
                </p>
                <p className="text-sm text-danger">{activity.parentResponse}</p>
              </div>
            )}

            {/* Pending indicator (child view) */}
            {activity.status === "pending" && !permissions.canFilterByType && (
              <p className="text-xs text-warning mt-2 flex items-center">
                <span className="mr-1">⏳</span>
                {t("history.waitingApproval")}
              </p>
            )}

            {/* Resubmit button (child only for rejected requests) */}
            {permissions.canResubmit &&
              activity.status === "rejected" &&
              activity.source === "child_request" && (
                <button
                  onClick={onResubmit}
                  className="mt-2 px-3 py-1 text-sm bg-primary text-gray-900 rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  {locale === "zh-CN" ? "修改并重新提交" : "Edit & Resubmit"}
                </button>
              )}
          </div>
        </div>

        <div className="text-right ml-4 flex-shrink-0">
          <div className={`text-2xl font-bold mb-2 ${getStarsColorClass()}`}>
            {activity.stars > 0 ? "+" : ""}
            {activity.stars}
          </div>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}
          >
            {t(`status.${activity.status}` as any)}
          </span>
          {actionButtons}
        </div>
      </div>
    </div>
  );
}
