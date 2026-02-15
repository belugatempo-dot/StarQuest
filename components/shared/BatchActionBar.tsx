"use client";

import { useTranslations } from "next-intl";

export interface BatchActionBarProps {
  selectedCount: number;
  isBatchProcessing: boolean;
  showBatchRejectModal: boolean;
  batchRejectReason: string;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onShowRejectModal: () => void;
  onHideRejectModal: () => void;
  onRejectReasonChange: (reason: string) => void;
  onExitSelectionMode: () => void;
}

export default function BatchActionBar({
  selectedCount,
  isBatchProcessing,
  showBatchRejectModal,
  batchRejectReason,
  onBatchApprove,
  onBatchReject,
  onShowRejectModal,
  onHideRejectModal,
  onRejectReasonChange,
  onExitSelectionMode,
}: BatchActionBarProps) {
  const t = useTranslations();

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t-2 border-purple-500/50 shadow-lg p-4 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="font-medium text-purple-300">
            {t("activity.itemsSelected", { count: selectedCount })}
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onBatchApprove}
              disabled={isBatchProcessing}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 font-medium"
            >
              {isBatchProcessing
                ? t("activity.processing")
                : `✅ ${t("activity.batchApprove")}`}
            </button>
            <button
              onClick={onShowRejectModal}
              disabled={isBatchProcessing}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 font-medium"
            >
              {`❌ ${t("activity.batchReject")}`}
            </button>
            <button
              onClick={onExitSelectionMode}
              className="px-4 py-2 bg-white/10 text-slate-400 rounded-lg hover:bg-white/20 transition"
            >
              {t("activity.clear")}
            </button>
          </div>
        </div>
      </div>

      {/* Batch Reject Modal */}
      {showBatchRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="dark-surface rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">
                {t("activity.batchRejectTitle")}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {t("activity.rejectingCount", { count: selectedCount })}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("activity.rejectionReason")}
                </label>
                <textarea
                  value={batchRejectReason}
                  onChange={(e) => onRejectReasonChange(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  placeholder={t("activity.rejectionPlaceholder")}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onHideRejectModal}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-slate-400 hover:bg-white/5 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={onBatchReject}
                  disabled={isBatchProcessing || !batchRejectReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                >
                  {isBatchProcessing
                    ? t("activity.processing")
                    : t("activity.confirmReject")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
