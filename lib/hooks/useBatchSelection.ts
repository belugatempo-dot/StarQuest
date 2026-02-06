"use client";

import { useState, useEffect } from "react";

export interface UseBatchSelectionReturn {
  selectionMode: boolean;
  setSelectionMode: (value: boolean) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  exitSelectionMode: () => void;
  isBatchProcessing: boolean;
  setIsBatchProcessing: (value: boolean) => void;
  showBatchRejectModal: boolean;
  setShowBatchRejectModal: (value: boolean) => void;
  batchRejectReason: string;
  setBatchRejectReason: (value: string) => void;
}

/**
 * Shared batch selection state management hook.
 * Used by RedemptionRequestList, StarRequestList, and UnifiedActivityList.
 */
export function useBatchSelection(): UseBatchSelectionReturn {
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

  const selectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  return {
    selectionMode,
    setSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    exitSelectionMode,
    isBatchProcessing,
    setIsBatchProcessing,
    showBatchRejectModal,
    setShowBatchRejectModal,
    batchRejectReason,
    setBatchRejectReason,
  };
}
