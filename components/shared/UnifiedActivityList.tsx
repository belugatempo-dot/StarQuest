"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  handleBatchOperation,
  buildApprovalPayload,
  buildRejectionPayload,
} from "@/lib/batch-operations";
import { useBatchSelection } from "@/lib/hooks/useBatchSelection";
import { useActivityFilters } from "@/lib/hooks/useActivityFilters";
import ActivityItem from "@/components/shared/ActivityItem";
import ActivityFilterBar from "@/components/shared/ActivityFilterBar";
import ActivityDateGroup from "@/components/shared/ActivityDateGroup";
import BatchActionBar from "@/components/shared/BatchActionBar";
import CalendarView from "@/components/admin/CalendarView";
import EditTransactionModal from "@/components/admin/EditTransactionModal";
import EditRedemptionModal from "@/components/admin/EditRedemptionModal";
import ResubmitRequestModal from "@/components/child/ResubmitRequestModal";
import AddRecordModal from "@/components/shared/AddRecordModal";
import RedeemFromCalendarModal from "@/components/shared/RedeemFromCalendarModal";
import type {
  UnifiedActivityItem,
  UnifiedActivityListProps,
} from "@/types/activity";
import { getPermissions } from "@/types/activity";
import {
  getActivityDescription,
  groupActivitiesByDate,
  calculateActivityStats,
} from "@/lib/activity-utils";
import { getTodayString } from "@/lib/date-utils";

export default function UnifiedActivityList({
  activities,
  locale,
  role,
  currentChildId,
  permissions: customPermissions,
  quests,
  familyChildren: childrenProp,
  currentUserId,
  familyId,
  rewards,
  childBalances,
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

  // Filter state
  const {
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
  } = useActivityFilters({
    activities,
    canFilterByType: permissions.canFilterByType,
  });

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

  // Add record modal state
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);

  // Redeem reward modal state
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  // Batch selection state (parent only)
  const batch = useBatchSelection();

  // Calculate stats
  const stats = useMemo(
    () => calculateActivityStats(activities),
    [activities]
  );

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

  // Batch approve handler (parent only)
  const handleBatchApprove = async () => {
    if (batch.selectedIds.size === 0) return;

    if (!confirm(t("activity.confirmBatchApprove", { count: batch.selectedIds.size }))) return;

    await handleBatchOperation({
      batch,
      supabase,
      router,
      table: "star_transactions",
      data: buildApprovalPayload(),
      onError: () => alert(t("activity.batchApproveFailed")),
    });
  };

  // Batch reject handler (parent only)
  const handleBatchReject = async () => {
    if (batch.selectedIds.size === 0 || !batch.batchRejectReason.trim()) return;

    await handleBatchOperation({
      batch,
      supabase,
      router,
      table: "star_transactions",
      data: buildRejectionPayload(batch.batchRejectReason),
      onSuccess: () => {
        batch.setShowBatchRejectModal(false);
        batch.setBatchRejectReason("");
      },
      onError: () => alert(t("activity.batchRejectFailed")),
    });
  };

  // Delete handler (parent only)
  const handleDelete = async (activity: UnifiedActivityItem) => {
    /* istanbul ignore next -- defensive guard: UI only shows delete for star_transactions */
    if (activity.type !== "star_transaction") {
      alert(t("activity.canOnlyDeleteStars"));
      return;
    }

    const starsStr = `${activity.stars > 0 ? "+" : ""}${activity.stars}⭐`;
    if (!confirm(t("activity.confirmDeleteRecord", {
      quest: getActivityDescription(activity, locale),
      stars: starsStr,
    }))) return;

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
      alert(t("activity.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  // Determine if "Add Record" button should be shown
  const canAddRecord = useMemo(() => {
    if (!quests || quests.length === 0 || !filterDate || !currentUserId || !familyId) return false;
    const today = getTodayString();
    return filterDate <= today;
  }, [quests, filterDate, currentUserId, familyId]);

  // Determine if "Redeem Reward" button should be shown (parent only)
  const canRedeem = useMemo(() => {
    if (role !== "parent" || !rewards || rewards.length === 0) return false;
    if (!filterDate || !currentUserId || !familyId) return false;
    const today = getTodayString();
    return filterDate <= today;
  }, [role, rewards, filterDate, currentUserId, familyId]);

  // Convert activities to transaction format for CalendarView
  const transactionsForCalendar = useMemo(() => {
    return activities.map((a) => ({
      id: a.id,
      stars: a.stars,
      status: a.status,
      created_at: a.createdAt,
    }));
  }, [activities]);

  const filterBarProps = {
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
    displayedCount: displayedActivities.length,
    totalCount: activities.length,
    permissions,
    pendingCount: pendingTransactions.length,
    selectionMode: batch.selectionMode,
    setSelectionMode: batch.setSelectionMode,
    selectedCount: batch.selectedIds.size,
    onSelectAll: () => batch.selectAll(pendingTransactions.map((t) => t.id)),
  } as const;

  return (
    <div className="space-y-6">
      {/* Filter Bar — full width in list mode only */}
      {viewMode === "list" && <ActivityFilterBar {...filterBarProps} />}

      {/* Main Layout: Calendar + Activity List */}
      <div
        className={`${viewMode === "calendar" ? "grid lg:grid-cols-2 gap-6" : ""}`}
      >
        {/* Left Column: Filter Bar + Calendar Picker */}
        {viewMode === "calendar" && (
          <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
            <ActivityFilterBar {...filterBarProps} />
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
            {(canAddRecord || canRedeem) && (
              <div className="space-y-2">
                {canAddRecord && (
                  <button
                    onClick={() => setShowAddRecordModal(true)}
                    className="w-full px-4 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition font-medium flex items-center justify-center space-x-2"
                    data-testid="add-record-button"
                  >
                    <span>➕</span>
                    <span>
                      {role === "parent"
                        ? t("activity.addRecord")
                        : t("activity.requestStars")}
                    </span>
                  </button>
                )}
                {canRedeem && (
                  <button
                    onClick={() => setShowRedeemModal(true)}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium flex items-center justify-center space-x-2"
                    data-testid="redeem-reward-button"
                  >
                    <span>🎁</span>
                    <span>{t("activity.redeemReward")}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Activity List - Right Side or Full Width */}
        <div className="space-y-6">
          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {displayedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-slate-400 text-lg">{t("history.emptyState")}</p>
                </div>
              ) : (
                displayedActivities.map((activity) => (
                  <ActivityItem
                    key={`${activity.type}-${activity.id}`}
                    activity={activity}
                    locale={locale}
                    permissions={permissions}
                    selectionMode={batch.selectionMode}
                    isSelected={batch.selectedIds.has(activity.id)}
                    onToggleSelection={() => batch.toggleSelection(activity.id)}
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
                <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-lg p-12 text-center">
                  <p className="text-slate-400">
                    {t("activity.noRecordsFound")}
                  </p>
                  {(canAddRecord || canRedeem) && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                      {canAddRecord && (
                        <button
                          onClick={() => setShowAddRecordModal(true)}
                          className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition text-sm"
                          data-testid="add-record-cta"
                        >
                          ➕ {role === "parent"
                            ? t("activity.addRecordCta")
                            : t("activity.requestStarsCta")}
                        </button>
                      )}
                      {canRedeem && (
                        <button
                          onClick={() => setShowRedeemModal(true)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                          data-testid="redeem-reward-cta"
                        >
                          🎁 {t("activity.redeemRewardCta")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                groupedByDate.map(([date, dayActivities]) => (
                  <ActivityDateGroup
                    key={date}
                    date={date}
                    activities={dayActivities}
                    locale={locale}
                    permissions={permissions}
                    selectionMode={batch.selectionMode}
                    selectedIds={batch.selectedIds}
                    onToggleSelection={(id) => batch.toggleSelection(id)}
                    onEdit={(activity) => {
                      if (activity.type === "redemption") {
                        setEditingRedemption(activity.originalData);
                      } else {
                        setEditingTransaction(activity.originalData);
                      }
                    }}
                    onDelete={(activity) => handleDelete(activity)}
                    onResubmit={(activity) => setResubmitTransaction(activity.originalData)}
                    deletingId={deletingId}
                  />
                ))
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

      {/* Add Record Modal */}
      {showAddRecordModal && filterDate && currentUserId && familyId && quests && (
        <AddRecordModal
          date={filterDate}
          role={role}
          locale={locale}
          quests={quests}
          familyChildren={childrenProp}
          currentUserId={currentUserId}
          familyId={familyId}
          onClose={() => setShowAddRecordModal(false)}
          onSuccess={() => setShowAddRecordModal(false)}
        />
      )}

      {/* Redeem Reward Modal */}
      {showRedeemModal && currentUserId && familyId && rewards && childrenProp && childBalances && (
        <RedeemFromCalendarModal
          locale={locale}
          rewards={rewards}
          familyChildren={childrenProp}
          childBalances={childBalances}
          currentUserId={currentUserId}
          familyId={familyId}
          onClose={() => setShowRedeemModal(false)}
          onSuccess={() => setShowRedeemModal(false)}
        />
      )}

      {/* Floating Action Bar + Reject Modal (parent only) */}
      {batch.selectedIds.size > 0 && permissions.canBatchApprove && (
        <BatchActionBar
          selectedCount={batch.selectedIds.size}
          isBatchProcessing={batch.isBatchProcessing}
          showBatchRejectModal={batch.showBatchRejectModal}
          batchRejectReason={batch.batchRejectReason}
          onBatchApprove={handleBatchApprove}
          onBatchReject={handleBatchReject}
          onShowRejectModal={() => batch.setShowBatchRejectModal(true)}
          onHideRejectModal={() => {
            batch.setShowBatchRejectModal(false);
            batch.setBatchRejectReason("");
          }}
          onRejectReasonChange={(reason) => batch.setBatchRejectReason(reason)}
          onExitSelectionMode={batch.exitSelectionMode}
        />
      )}
    </div>
  );
}

