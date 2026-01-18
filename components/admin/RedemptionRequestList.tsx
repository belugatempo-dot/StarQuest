"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RedemptionRequestListProps {
  requests: any[];
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

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Batch selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

  const getRewardName = (request: any) => {
    if (request.rewards) {
      return locale === "zh-CN"
        ? request.rewards.name_zh || request.rewards.name_en
        : request.rewards.name_en;
    }
    return "Unknown Reward";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Toggle individual selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all
  const selectAll = () => {
    setSelectedIds(new Set(requests.map((r) => r.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Exit selection mode
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);

    try {
      const { error } = await (supabase
        .from("redemptions")
        .update as any)({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      router.refresh();
    } catch (err) {
      console.error("Error approving redemption:", err);
      alert("Failed to approve redemption");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;

    setProcessingId(showRejectModal);

    try {
      const { error } = await (supabase
        .from("redemptions")
        .update as any)({
          status: "rejected",
          parent_response: rejectReason.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", showRejectModal);

      if (error) throw error;

      setShowRejectModal(null);
      setRejectReason("");
      router.refresh();
    } catch (err) {
      console.error("Error rejecting redemption:", err);
      alert("Failed to reject redemption");
    } finally {
      setProcessingId(null);
    }
  };

  // Batch approve handler
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;

    const confirmMessage =
      locale === "zh-CN"
        ? `确定要批准这 ${selectedIds.size} 条待审批请求吗？`
        : `Approve ${selectedIds.size} pending requests?`;

    if (!confirm(confirmMessage)) return;

    setIsBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await (supabase
        .from("redemptions")
        .update as any)({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) throw error;

      exitSelectionMode();
      router.refresh();
    } catch (err) {
      console.error("Batch approve error:", err);
      alert(locale === "zh-CN" ? "批量批准失败" : "Batch approve failed");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch reject handler
  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;

    setIsBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await (supabase
        .from("redemptions")
        .update as any)({
          status: "rejected",
          parent_response: batchRejectReason.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) throw error;

      setShowBatchRejectModal(false);
      setBatchRejectReason("");
      exitSelectionMode();
      router.refresh();
    } catch (err) {
      console.error("Batch reject error:", err);
      alert(locale === "zh-CN" ? "批量拒绝失败" : "Batch reject failed");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-gray-500 text-lg">{t("admin.noRequests")}</p>
        <p className="text-sm text-gray-400 mt-2">
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
            onClick={() => setSelectionMode(!selectionMode)}
            className={`px-4 py-2 rounded-lg transition font-medium ${
              selectionMode
                ? "bg-purple-500 text-white"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
          >
            {selectionMode ? "✅ " : "☐ "}
            {selectionMode ? t("admin.exitSelectMode") : t("admin.selectMode")}
          </button>
          {selectionMode && (
            <>
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
              >
                {t("admin.selectAll")} ({requests.length})
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  {t("admin.clearSelection")}
                </button>
              )}
            </>
          )}
        </div>
        {selectionMode && selectedIds.size > 0 && (
          <span className="text-sm font-medium text-purple-700">
            {locale === "zh-CN"
              ? `已选择 ${selectedIds.size} 项`
              : `${selectedIds.size} selected`}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className={`border-2 border-primary/30 rounded-lg p-6 hover:shadow-md transition ${
              selectionMode && selectedIds.has(request.id)
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
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(request.id)}
                      onChange={() => toggleSelection(request.id)}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  )}
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-2xl">
                    {request.users?.avatar_url || "👤"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {request.users?.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                </div>

                {/* Reward Info */}
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-3xl">
                    {request.rewards?.icon || "🎁"}
                  </span>
                  <div>
                    <h4 className="font-semibold">{getRewardName(request)}</h4>
                    {request.rewards?.category && (
                      <span className="text-xs text-gray-500">
                        {t(`rewards.category.${request.rewards.category}` as any)}
                      </span>
                    )}
                    {request.rewards?.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {request.rewards.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Child Note */}
                {request.child_note && (
                  <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-900 italic">
                      &quot;{request.child_note}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Cost and Actions */}
              <div className="ml-6 text-right flex-shrink-0">
                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">Cost</div>
                  <div className="text-3xl font-bold text-primary">
                    {request.stars_spent}
                  </div>
                  <div className="text-xs text-gray-500">stars</div>
                </div>

                {!selectionMode && (
                  <div className="space-y-2 mt-4">
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

                {!selectionMode && (
                  <p className="text-xs text-gray-500 mt-3">
                    Stars will be deducted upon approval
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
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
                  ? t("admin.batchProcessing")
                  : `✅ ${t("admin.batchApprove")}`}
              </button>
              <button
                onClick={() => setShowBatchRejectModal(true)}
                disabled={isBatchProcessing}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 font-medium"
              >
                {`❌ ${t("admin.batchReject")}`}
              </button>
              <button
                onClick={exitSelectionMode}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{t("admin.rejectReason")}</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-danger focus:border-transparent resize-none mb-4"
              placeholder={locale === "zh-CN" ? "（可选）说明拒绝原因..." : "(Optional) Explain why you're rejecting..."}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
      {showBatchRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{t("admin.batchReject")}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {locale === "zh-CN"
                  ? `将拒绝 ${selectedIds.size} 条待审批请求`
                  : `Rejecting ${selectedIds.size} pending requests`}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("admin.batchRejectReason")} ({locale === "zh-CN" ? "可选" : "optional"})
                </label>
                <textarea
                  value={batchRejectReason}
                  onChange={(e) => setBatchRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
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
                    setShowBatchRejectModal(false);
                    setBatchRejectReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleBatchReject}
                  disabled={isBatchProcessing}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                >
                  {isBatchProcessing
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
