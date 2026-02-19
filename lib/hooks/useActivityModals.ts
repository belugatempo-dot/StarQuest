"use client";

import { useState } from "react";
import type {
  StarTransaction,
  RawRedemption,
  UnifiedActivityItem,
} from "@/types/activity";

export interface ActivityModalsState {
  editingTransaction: StarTransaction | null;
  editingRedemption: RawRedemption | null;
  resubmitTransaction: StarTransaction | null;
  showAddRecordModal: boolean;
  showRedeemModal: boolean;
  openEditModal: (activity: UnifiedActivityItem) => void;
  openResubmitModal: (originalData: StarTransaction) => void;
  openAddRecordModal: () => void;
  openRedeemModal: () => void;
  closeEditTransaction: () => void;
  closeEditRedemption: () => void;
  closeResubmit: () => void;
  closeAddRecord: () => void;
  closeRedeem: () => void;
}

/**
 * Manages all modal open/close state for UnifiedActivityList.
 * Centralises the if/else edit-routing dispatch so call sites don't repeat it.
 */
export function useActivityModals(): ActivityModalsState {
  const [editingTransaction, setEditingTransaction] =
    useState<StarTransaction | null>(null);
  const [editingRedemption, setEditingRedemption] =
    useState<RawRedemption | null>(null);
  const [resubmitTransaction, setResubmitTransaction] =
    useState<StarTransaction | null>(null);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  const openEditModal = (activity: UnifiedActivityItem) => {
    if (activity.type === "redemption") {
      setEditingRedemption(activity.originalData as RawRedemption);
    } else {
      setEditingTransaction(activity.originalData as StarTransaction);
    }
  };

  const openResubmitModal = (originalData: StarTransaction) => {
    setResubmitTransaction(originalData);
  };

  return {
    editingTransaction,
    editingRedemption,
    resubmitTransaction,
    showAddRecordModal,
    showRedeemModal,
    openEditModal,
    openResubmitModal,
    openAddRecordModal: () => setShowAddRecordModal(true),
    openRedeemModal: () => setShowRedeemModal(true),
    closeEditTransaction: () => setEditingTransaction(null),
    closeEditRedemption: () => setEditingRedemption(null),
    closeResubmit: () => setResubmitTransaction(null),
    closeAddRecord: () => setShowAddRecordModal(false),
    closeRedeem: () => setShowRedeemModal(false),
  };
}
