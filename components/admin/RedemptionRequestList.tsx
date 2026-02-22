"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/date-utils";
import { getRewardName } from "@/lib/localization";
import { useRedemptionActions } from "@/lib/hooks/useRedemptionActions";
import type { RedemptionRequest } from "@/types/activity";

interface RedemptionRequestListProps {
  requests: RedemptionRequest[];
  locale: string;
  parentId: string;
}

export default function RedemptionRequestList({
  requests,
  locale,
  parentId,
}: RedemptionRequestListProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const actions = useRedemptionActions({
    supabase,
    router,
    t: t as any,
    parentId,
  });
  const { batch } = actions;

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-slate-400 text-lg">{t("admin.noRequests")}</p>
        <p className="text-sm text-slate-500 mt-2">
          You're all caught up! New redemption requests will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Batch Selection Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => batch.setSelectionMode(!batch.selectionMode)}
            className={`px-4 py-2 rounded-lg transition font-medium ${
              batch.selectionMode
                ? "bg-purple-500 text-white"
                : "bg-purple-500/15 text-purple-300 hover:bg-purple-500/25"
            }`}
          >
            {batch.selectionMode ? "✅ " : "☐ "}
            {batch.selectionMode ? t("admin.exitSelectMode") : t("admin.selectMode")}
          </button>
          {batch.selectionMode && (
            <>
              <button
                onClick={() => batch.selectAll(requests.map((r) => r.id))}
                className="px-4 py-2 bg-blue-500/15 text-blue-300 rounded-lg hover:bg-blue-500/25 transition"
              >
                {t("admin.selectAll")} ({requests.length})
              </button>
              {batch.selectedIds.size > 0 && (
                <button
                  onClick={batch.clearSelection}
                  className="px-4 py-2 bg-white/10 text-slate-300 rounded-lg hover:bg-white/15 transition"
                >
                  {t("admin.clearSelection")}
                </button>
              )}
            </>
          )}
        </div>
        {batch.selectionMode && batch.selectedIds.size > 0 && (
          <span className="text-sm font-medium text-purple-300">
            {t("admin.selectedCount", { count: batch.selectedIds.size })}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className={`border-2 border-primary/30 rounded-lg p-6 hover:shadow-md transition ${
              batch.selectionMode && batch.selectedIds.has(request.id)
                ? "ring-2 ring-purple-500 border-purple-300"
                : ""
            }`}
          >
            <div className="flex items-start justify-between">
              {/* Left: Request Info */}
              <div className="flex-1">
                {/* Child Info */}
                <div className="flex items-center space-x-3 mb-4">
                  {batch.selectionMode && (
                    <input
                      type="checkbox"
                      checked={batch.selectedIds.has(request.id)}
                      onChange={() => batch.toggleSelection(request.id)}
                      className="w-5 h-5 rounded border-white/20 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  )}
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-2xl">
                    {request.users?.avatar_url || "👤"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {request.users?.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {formatDateTime(request.created_at, locale)}
                    </p>
                  </div>
                </div>

                {/* Reward Info */}
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-3xl">
                    {request.rewards?.icon || "🎁"}
                  </span>
                  <div>
                    <h4 className="font-semibold">{getRewardName(request.rewards, locale)}</h4>
                    {request.rewards?.category && (
                      <span className="text-xs text-slate-400">
                        {t(`rewards.category.${request.rewards.category}` as any)}
                      </span>
                    )}
                    {request.rewards?.description && (
                      <p className="text-sm text-slate-400 mt-1">
                        {request.rewards.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Child Note */}
                {request.child_note && (
                  <div className="mt-3 p-3 bg-blue-500/10 rounded border border-blue-500/30">
                    <p className="text-sm text-blue-300 italic">
                      &quot;{request.child_note}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Cost and Actions */}
              <div className="ml-6 text-right flex-shrink-0">
                <div className="mb-2">
                  <div className="text-xs text-slate-400 mb-1">Cost</div>
                  <div className="text-3xl font-bold text-primary">
                    {request.stars_spent}
                  </div>
                  <div className="text-xs text-slate-400">stars</div>
                </div>

                {!batch.selectionMode && (
                  <div className="space-y-2 mt-4">
                    <button
                      onClick={() => actions.openApproveModal(request.id)}
                      disabled={actions.processingId === request.id}
                      className="w-full px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition disabled:opacity-50"
                    >
                      {actions.processingId === request.id
                        ? t("admin.processing")
                        : t("admin.approve")}
                    </button>
                    <button
                      onClick={() => actions.openRejectModal(request.id)}
                      disabled={actions.processingId === request.id}
                      className="w-full px-4 py-2 border border-danger text-danger rounded-lg hover:bg-danger/10 transition disabled:opacity-50"
                    >
                      {t("admin.reject")}
                    </button>
                  </div>
                )}

                {!batch.selectionMode && (
                  <p className="text-xs text-slate-400 mt-3">
                    Stars will be deducted upon approval
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Batch Action Bar */}
      {batch.selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t-2 border-purple-500/30 shadow-lg p-4 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="font-medium text-purple-300">
              {t("admin.itemsSelectedCount", { count: batch.selectedIds.size })}
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={actions.openBatchApproveModal}
                disabled={batch.isBatchProcessing}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 font-medium"
              >
                {batch.isBatchProcessing
                  ? t("admin.batchProcessing")
                  : `✅ ${t("admin.batchApprove")}`}
              </button>
              <button
                onClick={() => batch.setShowBatchRejectModal(true)}
                disabled={batch.isBatchProcessing}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 font-medium"
              >
                {`❌ ${t("admin.batchReject")}`}
              </button>
              <button
                onClick={batch.exitSelectionMode}
                className="px-4 py-2 bg-white/15 text-slate-300 rounded-lg hover:bg-white/20 transition"
              >
                {t("admin.clearSelection")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Approve Modal */}
      {actions.showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="dark-card rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{t("admin.confirmApproval")}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("admin.approvalDate")}
              </label>
              <input
                type="date"
                value={actions.approvalDate}
                onChange={(e) => actions.setApprovalDate(e.target.value)}
                max={actions.maxDate || undefined}
                className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-success focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={actions.closeApproveModal}
                className="flex-1 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={actions.confirmApprove}
                disabled={actions.processingId === actions.showApproveModal}
                className="flex-1 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 disabled:opacity-50"
              >
                {actions.processingId ? t("admin.processing") : t("admin.approve")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Reject Modal */}
      {actions.showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="dark-card rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{t("admin.rejectReason")}</h3>
            <textarea
              value={actions.rejectReason}
              onChange={(e) => actions.setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-danger focus:border-transparent resize-none mb-4"
              placeholder={t("admin.rejectPlaceholder")}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={actions.closeRejectModal}
                className="flex-1 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={actions.confirmReject}
                disabled={actions.processingId === actions.showRejectModal}
                className="flex-1 px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger/90 disabled:opacity-50"
              >
                {actions.processingId ? t("admin.processing") : t("admin.reject")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Approve Modal */}
      {actions.showBatchApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="dark-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">{t("admin.batchApprove")}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {t("admin.approvingPendingCount", { count: batch.selectedIds.size })}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("admin.approvalDate")}
                </label>
                <input
                  type="date"
                  value={actions.batchApprovalDate}
                  onChange={(e) => actions.setBatchApprovalDate(e.target.value)}
                  max={actions.maxDate || undefined}
                  className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={actions.closeBatchApproveModal}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-slate-300 hover:bg-white/5 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={actions.confirmBatchApprove}
                  disabled={batch.isBatchProcessing}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                >
                  {batch.isBatchProcessing
                    ? t("admin.batchProcessing")
                    : t("admin.approve")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Reject Modal */}
      {batch.showBatchRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="dark-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">{t("admin.batchReject")}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {t("admin.rejectingPendingCount", { count: batch.selectedIds.size })}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("admin.batchRejectReason")} ({t("admin.optionalLabel")})
                </label>
                <textarea
                  value={batch.batchRejectReason}
                  onChange={(e) => batch.setBatchRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  placeholder={t("admin.batchRejectPlaceholder")}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    batch.setShowBatchRejectModal(false);
                    batch.setBatchRejectReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-slate-300 hover:bg-white/5 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={actions.handleBatchReject}
                  disabled={batch.isBatchProcessing}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                >
                  {batch.isBatchProcessing
                    ? t("admin.batchProcessing")
                    : t("admin.reject")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
