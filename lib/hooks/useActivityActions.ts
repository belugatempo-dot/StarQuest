"use client";

import { useState } from "react";
import {
  handleBatchOperation,
  buildApprovalPayload,
  buildRejectionPayload,
} from "@/lib/batch-operations";
import { getActivityDescription } from "@/lib/activity-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { UnifiedActivityItem } from "@/types/activity";
import type { UseBatchSelectionReturn } from "@/lib/hooks/useBatchSelection";

export interface UseActivityActionsOptions {
  batch: UseBatchSelectionReturn;
  supabase: SupabaseClient<any, any, any>;
  router: AppRouterInstance;
  t: (key: string, values?: Record<string, string | number | boolean>) => string;
  locale: string;
}

export interface UseActivityActionsReturn {
  deletingId: string | null;
  handleDelete: (activity: UnifiedActivityItem) => Promise<void>;
  handleBatchApprove: () => Promise<void>;
  handleBatchReject: () => Promise<void>;
}

/**
 * Encapsulates the three mutating action handlers for the activity list:
 * batch approve, batch reject, and single-item delete.
 */
export function useActivityActions({
  batch,
  supabase,
  router,
  t,
  locale,
}: UseActivityActionsOptions): UseActivityActionsReturn {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleBatchApprove = async () => {
    if (batch.selectedIds.size === 0) return;

    if (
      !confirm(
        t("activity.confirmBatchApprove", { count: batch.selectedIds.size })
      )
    )
      return;

    await handleBatchOperation({
      batch,
      supabase,
      router,
      table: "star_transactions",
      data: buildApprovalPayload(),
      onError: () => alert(t("activity.batchApproveFailed")),
    });
  };

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

  const handleDelete = async (activity: UnifiedActivityItem) => {
    /* istanbul ignore next -- defensive guard: UI only shows delete for star_transactions */
    if (activity.type !== "star_transaction") {
      alert(t("activity.canOnlyDeleteStars"));
      return;
    }

    const starsStr = `${activity.stars > 0 ? "+" : ""}${activity.stars}⭐`;
    if (
      !confirm(
        t("activity.confirmDeleteRecord", {
          quest: getActivityDescription(activity, locale),
          stars: starsStr,
        })
      )
    )
      return;

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

  return { deletingId, handleDelete, handleBatchApprove, handleBatchReject };
}
