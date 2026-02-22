"use client";

import { useState, useEffect } from "react";
import { typedUpdate } from "@/lib/supabase/helpers";
import {
  handleBatchOperation,
  buildApprovalPayload,
  buildRejectionPayload,
} from "@/lib/batch-operations";
import { getTodayString, toApprovalTimestamp } from "@/lib/date-utils";
import { useBatchSelection } from "@/lib/hooks/useBatchSelection";
import type { UseBatchSelectionReturn } from "@/lib/hooks/useBatchSelection";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface UseRedemptionActionsOptions {
  supabase: SupabaseClient<any, any, any>;
  router: AppRouterInstance;
  t: (key: string, values?: Record<string, string | number | boolean>) => string;
  parentId: string;
}

export interface UseRedemptionActionsReturn {
  processingId: string | null;
  batch: UseBatchSelectionReturn;
  // Individual approve
  showApproveModal: string | null;
  approvalDate: string;
  maxDate: string;
  setApprovalDate: (d: string) => void;
  openApproveModal: (id: string) => void;
  closeApproveModal: () => void;
  confirmApprove: () => Promise<void>;
  // Individual reject
  showRejectModal: string | null;
  rejectReason: string;
  setRejectReason: (r: string) => void;
  openRejectModal: (id: string) => void;
  closeRejectModal: () => void;
  confirmReject: () => Promise<void>;
  // Batch approve
  showBatchApproveModal: boolean;
  batchApprovalDate: string;
  setBatchApprovalDate: (d: string) => void;
  openBatchApproveModal: () => void;
  closeBatchApproveModal: () => void;
  confirmBatchApprove: () => Promise<void>;
  // Batch reject
  handleBatchReject: () => Promise<void>;
}

/**
 * Encapsulates all state and handlers for the RedemptionRequestList component:
 * individual approve/reject, batch approve/reject, and processing indicators.
 */
export function useRedemptionActions({
  supabase,
  router,
  t,
}: UseRedemptionActionsOptions): UseRedemptionActionsReturn {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
  const [approvalDate, setApprovalDate] = useState<string>("");
  const [maxDate, setMaxDate] = useState<string>("");

  const batch = useBatchSelection();

  const [showBatchApproveModal, setShowBatchApproveModal] = useState(false);
  const [batchApprovalDate, setBatchApprovalDate] = useState<string>("");

  // Initialize dates on client mount to avoid SSR timezone issues
  useEffect(() => {
    const today = getTodayString();
    setApprovalDate(today);
    setBatchApprovalDate(today);
    setMaxDate(today);
  }, []);

  // --- Individual approve ---
  const openApproveModal = (id: string) => {
    setApprovalDate(getTodayString());
    setShowApproveModal(id);
  };

  const closeApproveModal = () => setShowApproveModal(null);

  const confirmApprove = async () => {
    if (!showApproveModal) return;

    setProcessingId(showApproveModal);

    try {
      const { error } = await typedUpdate(supabase, "redemptions", {
        status: "approved",
        reviewed_at: toApprovalTimestamp(approvalDate),
      }).eq("id", showApproveModal);

      if (error) throw error;

      setShowApproveModal(null);
      router.refresh();
    } catch (err) {
      console.error("Error approving redemption:", err);
      alert("Failed to approve redemption");
    } finally {
      setProcessingId(null);
    }
  };

  // --- Individual reject ---
  const openRejectModal = (id: string) => setShowRejectModal(id);

  const closeRejectModal = () => {
    setShowRejectModal(null);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!showRejectModal) return;

    setProcessingId(showRejectModal);

    try {
      const { error } = await typedUpdate(supabase, "redemptions", {
        status: "rejected",
        parent_response: rejectReason.trim() || null,
        reviewed_at: new Date().toISOString(),
      }).eq("id", showRejectModal);

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

  // --- Batch approve ---
  const openBatchApproveModal = () => {
    if (batch.selectedIds.size === 0) return;
    setBatchApprovalDate(getTodayString());
    setShowBatchApproveModal(true);
  };

  const closeBatchApproveModal = () => setShowBatchApproveModal(false);

  const confirmBatchApprove = async () => {
    if (batch.selectedIds.size === 0) return;

    await handleBatchOperation({
      batch,
      supabase,
      router,
      table: "redemptions",
      data: buildApprovalPayload(undefined, toApprovalTimestamp(batchApprovalDate)),
      onSuccess: () => setShowBatchApproveModal(false),
      onError: () => alert(t("admin.batchApproveFailed")),
    });
  };

  // --- Batch reject ---
  const handleBatchReject = async () => {
    if (batch.selectedIds.size === 0) return;

    await handleBatchOperation({
      batch,
      supabase,
      router,
      table: "redemptions",
      data: buildRejectionPayload(batch.batchRejectReason),
      onSuccess: () => {
        batch.setShowBatchRejectModal(false);
        batch.setBatchRejectReason("");
      },
      onError: () => alert(t("admin.batchRejectFailed")),
    });
  };

  return {
    processingId,
    batch,
    // Individual approve
    showApproveModal,
    approvalDate,
    maxDate,
    setApprovalDate,
    openApproveModal,
    closeApproveModal,
    confirmApprove,
    // Individual reject
    showRejectModal,
    rejectReason,
    setRejectReason,
    openRejectModal,
    closeRejectModal,
    confirmReject,
    // Batch approve
    showBatchApproveModal,
    batchApprovalDate,
    setBatchApprovalDate,
    openBatchApproveModal,
    closeBatchApproveModal,
    confirmBatchApprove,
    // Batch reject
    handleBatchReject,
  };
}
