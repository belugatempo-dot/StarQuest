"use client";

import { useState } from "react";
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

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);

    try {
      const { error } = await supabase
        .from("redemptions")
        .update({
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
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setProcessingId(showRejectModal);

    try {
      const { error } = await supabase
        .from("redemptions")
        .update({
          status: "rejected",
          parent_response: rejectReason,
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
      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="border-2 border-primary/30 rounded-lg p-6 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              {/* Left: Request Info */}
              <div className="flex-1">
                {/* Child Info */}
                <div className="flex items-center space-x-3 mb-4">
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

                <p className="text-xs text-gray-500 mt-3">
                  Stars will be deducted upon approval
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{t("admin.rejectReason")}</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-danger focus:border-transparent resize-none mb-4"
              placeholder="Explain why you're rejecting this redemption..."
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
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger/90 disabled:opacity-50"
              >
                {processingId ? t("admin.processing") : t("admin.reject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
