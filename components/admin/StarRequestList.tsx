"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate } from "@/lib/supabase/helpers";
import {
  handleBatchOperation,
  buildApprovalPayload,
  buildRejectionPayload,
} from "@/lib/batch-operations";
import { getQuestName } from "@/lib/localization";
import { formatDateTime } from "@/lib/date-utils";
import { useBatchSelection } from "@/lib/hooks/useBatchSelection";

interface StarRequestListProps {
  requests: any[];
  locale: string;
  parentId: string;
}

export default function StarRequestList({
  requests,
  locale,
  parentId,
}: StarRequestListProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Batch selection state
  const batch = useBatchSelection();

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);

    try {
      const { error } = await typedUpdate(supabase, "star_transactions", {
          status: "approved",
          reviewed_by: parentId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      router.refresh();
    } catch (err) {
      console.error("Error approving request:", err);
      alert("Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;

    setProcessingId(showRejectModal);

    try {
      const { error } = await typedUpdate(supabase, "star_transactions", {
          status: "rejected",
          parent_response: rejectReason.trim() || null,
          reviewed_by: parentId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", showRejectModal);

      if (error) throw error;

      setShowRejectModal(null);
      setRejectReason("");
      router.refresh();
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  // Batch approve handler
  const handleBatchApprove = async () => {
    if (batch.selectedIds.size === 0) return;

    const confirmMessage =
      locale === "zh-CN"
        ? `确定要批准这 ${batch.selectedIds.size} 条待审批请求吗？`
        : `Approve ${batch.selectedIds.size} pending requests?`;

    if (!confirm(confirmMessage)) return;

    await handleBatchOperation({
      batch,
      supabase,
      router,
      table: "star_transactions",
      data: buildApprovalPayload(parentId),
      onError: () => alert(locale === "zh-CN" ? "批量批准失败" : "Batch approve failed"),
    });
  };

  // Batch reject handler
  const handleBatchReject = async () => {
    if (batch.selectedIds.size === 0) return;

    await handleBatchOperation({
      batch,
      supabase,
      router,
      table: "star_transactions",
      data: buildRejectionPayload(batch.batchRejectReason, parentId),
      onSuccess: () => {
        batch.setShowBatchRejectModal(false);
        batch.setBatchRejectReason("");
      },
      onError: () => alert(locale === "zh-CN" ? "批量拒绝失败" : "Batch reject failed"),
    });
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-slate-400 text-lg">{t("admin.noRequests")}</p>
        <p className="text-sm text-slate-500 mt-2">
          You're all caught up! New requests will appear here.
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
                onClick={() => batch.selectAll(requests.map((r: any) => r.id))}
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
            {locale === "zh-CN"
              ? `已选择 ${batch.selectedIds.size} 项`
              : `${batch.selectedIds.size} selected`}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className={`border-2 border-warning/30 rounded-lg p-6 hover:shadow-md transition ${
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
                  {/* Checkbox for selection mode */}
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

                {/* Quest Info */}
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-3xl">
                    {request.quests?.icon || "⭐"}
                  </span>
                  <div>
                    <h4 className="font-semibold">{request.quests ? getQuestName(request.quests, locale) : (request.custom_description || "Custom")}</h4>
                    {request.quests?.category && (
                      <span className="text-xs text-slate-400">
                        {t(`quests.category.${request.quests.category}` as any)}
                      </span>
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

              {/* Right: Stars and Actions */}
              <div className="ml-6 text-right flex-shrink-0">
                <div className="text-3xl font-bold text-success mb-4">
                  +{request.stars}
                </div>

                {!batch.selectionMode && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="w-full px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition disabled:opacity-50"
                    >
                      {processingId === request.id
                        ? t("admin.processing")
                        : t("admin.approve")}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(request.id)}
                      disabled={processingId === request.id}
                      className="w-full px-4 py-2 border border-danger text-danger rounded-lg hover:bg-danger/10 transition disabled:opacity-50"
                    >
                      {t("admin.reject")}
                    </button>
                  </div>
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
              {locale === "zh-CN"
                ? `已选择 ${batch.selectedIds.size} 项`
                : `${batch.selectedIds.size} items selected`}
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBatchApprove}
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

      {/* Individual Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="dark-card rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{t("admin.rejectReason")}</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-danger focus:border-transparent resize-none mb-4"
              placeholder={locale === "zh-CN" ? "（可选）说明拒绝原因..." : "(Optional) Explain why you're rejecting..."}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === showRejectModal}
                className="flex-1 px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger/90 disabled:opacity-50"
              >
                {processingId ? t("admin.processing") : t("admin.reject")}
              </button>
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
                {locale === "zh-CN"
                  ? `将拒绝 ${batch.selectedIds.size} 条待审批请求`
                  : `Rejecting ${batch.selectedIds.size} pending requests`}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("admin.batchRejectReason")} ({locale === "zh-CN" ? "可选" : "optional"})
                </label>
                <textarea
                  value={batch.batchRejectReason}
                  onChange={(e) => batch.setBatchRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 dark-input rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  placeholder={
                    locale === "zh-CN"
                      ? "（可选）输入拒绝原因..."
                      : "(Optional) Enter rejection reason..."
                  }
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
                  onClick={handleBatchReject}
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
