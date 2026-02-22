/**
 * Batch Operations Utility
 *
 * Shared batch approve/reject logic used by:
 * - UnifiedActivityList
 * - StarRequestList
 * - RedemptionRequestList
 */

import { typedUpdate } from "@/lib/supabase/helpers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** Build an approval payload for batch updates */
export function buildApprovalPayload(
  reviewedBy?: string,
  reviewedAt?: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    status: "approved",
    reviewed_at: reviewedAt || new Date().toISOString(),
  };
  if (reviewedBy) {
    payload.reviewed_by = reviewedBy;
  }
  return payload;
}

/** Build a rejection payload for batch updates */
export function buildRejectionPayload(
  reason: string,
  reviewedBy?: string,
  reviewedAt?: string
): Record<string, unknown> {
  const trimmed = reason.trim();
  const payload: Record<string, unknown> = {
    status: "rejected",
    parent_response: trimmed || null,
    reviewed_at: reviewedAt || new Date().toISOString(),
  };
  if (reviewedBy) {
    payload.reviewed_by = reviewedBy;
  }
  return payload;
}

/** Execute a batch update on a Supabase table */
export async function executeBatchUpdate(options: {
  supabase: SupabaseClient<any, any, any>;
  table: string;
  ids: string[];
  data: Record<string, unknown>;
}): Promise<{ success: boolean; error?: any }> {
  const { supabase, table, ids, data } = options;
  // Supabase's typed helpers require a table name literal, but we pass a runtime string.
  // The casts are necessary because the generic type can't be inferred from a dynamic table name.
  const { error } = await typedUpdate(supabase, table as any, data as any).in(
    "id",
    ids
  );
  if (error) return { success: false, error };
  return { success: true };
}

/** Minimal batch interface needed by handleBatchOperation */
interface BatchHandle {
  selectedIds: Set<string>;
  setIsBatchProcessing: (value: boolean) => void;
  exitSelectionMode: () => void;
}

/** Full handler: wraps executeBatchUpdate with processing state lifecycle */
export async function handleBatchOperation(options: {
  batch: BatchHandle;
  supabase: SupabaseClient<any, any, any>;
  router: AppRouterInstance;
  table: string;
  data: Record<string, unknown>;
  onError?: (error: any) => void;
  onSuccess?: () => void;
}): Promise<void> {
  const { batch, supabase, router, table, data, onError, onSuccess } = options;

  if (batch.selectedIds.size === 0) return;

  batch.setIsBatchProcessing(true);
  try {
    const ids = Array.from(batch.selectedIds);
    const result = await executeBatchUpdate({ supabase, table, ids, data });

    if (!result.success) {
      onError?.(result.error);
      return;
    }

    onSuccess?.();
    batch.exitSelectionMode();
    router.refresh();
  } finally {
    batch.setIsBatchProcessing(false);
  }
}
