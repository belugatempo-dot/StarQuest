import { renderHook, act } from "@testing-library/react";
import { useActivityModals } from "@/lib/hooks/useActivityModals";
import type {
  UnifiedActivityItem,
  StarTransaction,
  RawRedemption,
} from "@/types/activity";

const makeActivity = (
  type: "star_transaction" | "redemption" | "credit_transaction",
  data: object = {}
): UnifiedActivityItem => ({
  id: "act-1",
  type,
  childId: "child-1",
  childName: "Test Child",
  childAvatar: null,
  stars: 5,
  description: "Test",
  descriptionZh: null,
  icon: "⭐",
  status: "approved",
  childNote: null,
  parentResponse: null,
  source: null,
  createdAt: "2026-01-01T00:00:00Z",
  questId: null,
  originalData: data as StarTransaction,
});

describe("useActivityModals", () => {
  it("initializes with all modals closed and null editing states", () => {
    const { result } = renderHook(() => useActivityModals());
    expect(result.current.editingTransaction).toBeNull();
    expect(result.current.editingRedemption).toBeNull();
    expect(result.current.resubmitTransaction).toBeNull();
    expect(result.current.showAddRecordModal).toBe(false);
    expect(result.current.showRedeemModal).toBe(false);
  });

  describe("openEditModal", () => {
    it("sets editingTransaction for star_transaction type", () => {
      const { result } = renderHook(() => useActivityModals());
      const txData = { id: "tx-1", stars: 5 } as unknown as StarTransaction;
      act(() => {
        result.current.openEditModal(makeActivity("star_transaction", txData));
      });
      expect(result.current.editingTransaction).toBe(txData);
      expect(result.current.editingRedemption).toBeNull();
    });

    it("sets editingRedemption for redemption type", () => {
      const { result } = renderHook(() => useActivityModals());
      const redemptionData = { id: "r-1" } as unknown as RawRedemption;
      act(() => {
        result.current.openEditModal(makeActivity("redemption", redemptionData));
      });
      expect(result.current.editingRedemption).toBe(redemptionData);
      expect(result.current.editingTransaction).toBeNull();
    });

    it("sets editingTransaction for credit_transaction type", () => {
      const { result } = renderHook(() => useActivityModals());
      const txData = { id: "ct-1" } as unknown as StarTransaction;
      act(() => {
        result.current.openEditModal(makeActivity("credit_transaction", txData));
      });
      expect(result.current.editingTransaction).toBe(txData);
      expect(result.current.editingRedemption).toBeNull();
    });
  });

  it("openResubmitModal sets resubmitTransaction", () => {
    const { result } = renderHook(() => useActivityModals());
    const tx = { id: "tx-1" } as unknown as StarTransaction;
    act(() => {
      result.current.openResubmitModal(tx);
    });
    expect(result.current.resubmitTransaction).toBe(tx);
  });

  it("openAddRecordModal sets showAddRecordModal to true", () => {
    const { result } = renderHook(() => useActivityModals());
    act(() => {
      result.current.openAddRecordModal();
    });
    expect(result.current.showAddRecordModal).toBe(true);
  });

  it("openRedeemModal sets showRedeemModal to true", () => {
    const { result } = renderHook(() => useActivityModals());
    act(() => {
      result.current.openRedeemModal();
    });
    expect(result.current.showRedeemModal).toBe(true);
  });

  it("closeEditTransaction clears editingTransaction", () => {
    const { result } = renderHook(() => useActivityModals());
    act(() => {
      result.current.openEditModal(
        makeActivity("star_transaction", { id: "tx-1" })
      );
    });
    act(() => {
      result.current.closeEditTransaction();
    });
    expect(result.current.editingTransaction).toBeNull();
  });

  it("closeEditRedemption clears editingRedemption", () => {
    const { result } = renderHook(() => useActivityModals());
    act(() => {
      result.current.openEditModal(makeActivity("redemption", { id: "r-1" }));
    });
    act(() => {
      result.current.closeEditRedemption();
    });
    expect(result.current.editingRedemption).toBeNull();
  });

  it("closeResubmit clears resubmitTransaction", () => {
    const { result } = renderHook(() => useActivityModals());
    act(() => {
      result.current.openResubmitModal({
        id: "tx-1",
      } as unknown as StarTransaction);
    });
    act(() => {
      result.current.closeResubmit();
    });
    expect(result.current.resubmitTransaction).toBeNull();
  });

  it("closeAddRecord sets showAddRecordModal to false", () => {
    const { result } = renderHook(() => useActivityModals());
    act(() => {
      result.current.openAddRecordModal();
    });
    act(() => {
      result.current.closeAddRecord();
    });
    expect(result.current.showAddRecordModal).toBe(false);
  });

  it("closeRedeem sets showRedeemModal to false", () => {
    const { result } = renderHook(() => useActivityModals());
    act(() => {
      result.current.openRedeemModal();
    });
    act(() => {
      result.current.closeRedeem();
    });
    expect(result.current.showRedeemModal).toBe(false);
  });
});
