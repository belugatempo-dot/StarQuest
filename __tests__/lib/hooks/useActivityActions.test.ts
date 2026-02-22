import { renderHook, act, waitFor } from "@testing-library/react";
import { useActivityActions } from "@/lib/hooks/useActivityActions";
import type { UnifiedActivityItem } from "@/types/activity";
import type { UseBatchSelectionReturn } from "@/lib/hooks/useBatchSelection";

// Mock batch-operations so tests don't touch Supabase
jest.mock("@/lib/batch-operations", () => ({
  handleBatchOperation: jest.fn().mockResolvedValue(undefined),
  buildApprovalPayload: jest.fn().mockReturnValue({ status: "approved" }),
  buildRejectionPayload: jest
    .fn()
    .mockReturnValue({ status: "rejected", parent_response: "reason" }),
}));

// Mock activity-utils to avoid needing a full activity object for descriptions
jest.mock("@/lib/activity-utils", () => ({
  getActivityDescription: jest.fn().mockReturnValue("Test Quest"),
  groupActivitiesByDate: jest.fn().mockReturnValue([]),
  calculateActivityStats: jest.fn().mockReturnValue({}),
  transformStarTransaction: jest.fn(),
  transformRedemption: jest.fn(),
  transformCreditTransaction: jest.fn(),
}));

import { handleBatchOperation } from "@/lib/batch-operations";

const makeActivity = (
  overrides: Partial<UnifiedActivityItem> = {}
): UnifiedActivityItem => ({
  id: "act-1",
  type: "star_transaction",
  childId: "child-1",
  childName: "Test Child",
  childAvatar: null,
  stars: 5,
  description: "Test Quest",
  descriptionZh: null,
  icon: "⭐",
  status: "approved",
  childNote: null,
  parentResponse: null,
  source: "parent_record",
  createdAt: "2026-01-01T00:00:00Z",
  questId: "quest-1",
  originalData: {} as any,
  ...overrides,
});

const makeBatch = (
  overrides: Partial<UseBatchSelectionReturn> = {}
): UseBatchSelectionReturn => ({
  selectionMode: true,
  setSelectionMode: jest.fn(),
  selectedIds: new Set(["id-1", "id-2"]),
  toggleSelection: jest.fn(),
  selectAll: jest.fn(),
  clearSelection: jest.fn(),
  exitSelectionMode: jest.fn(),
  isBatchProcessing: false,
  setIsBatchProcessing: jest.fn(),
  showBatchRejectModal: false,
  setShowBatchRejectModal: jest.fn(),
  batchRejectReason: "reason",
  setBatchRejectReason: jest.fn(),
  ...overrides,
});

const makeSupabase = (deleteError: unknown = null) => {
  const eq = jest.fn().mockResolvedValue({ error: deleteError });
  const del = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ delete: del });
  return { from, _eq: eq, _delete: del };
};

const makeRouter = () => ({ refresh: jest.fn() });

const t = (key: string) => key;

describe("useActivityActions", () => {
  let confirmSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  describe("initial state", () => {
    it("starts with deletingId as null", () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch();
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );
      expect(result.current.deletingId).toBeNull();
    });
  });

  describe("handleBatchApprove", () => {
    it("does nothing when no items are selected", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch({ selectedIds: new Set() });
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleBatchApprove();
      });

      expect(handleBatchOperation).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("does nothing when user cancels the confirm dialog", async () => {
      confirmSpy.mockReturnValue(false);
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch();
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleBatchApprove();
      });

      expect(handleBatchOperation).not.toHaveBeenCalled();
    });

    it("calls handleBatchOperation with approval payload when confirmed", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch();
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleBatchApprove();
      });

      expect(handleBatchOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          batch,
          table: "star_transactions",
          data: { status: "approved" },
        })
      );
    });
  });

  describe("handleBatchReject", () => {
    it("does nothing when no items are selected", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch({ selectedIds: new Set() });
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleBatchReject();
      });

      expect(handleBatchOperation).not.toHaveBeenCalled();
    });

    it("does nothing when reject reason is empty", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch({ batchRejectReason: "   " });
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleBatchReject();
      });

      expect(handleBatchOperation).not.toHaveBeenCalled();
    });

    it("calls handleBatchOperation with rejection payload when valid", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch({ batchRejectReason: "Not good enough" });
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleBatchReject();
      });

      expect(handleBatchOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          batch,
          table: "star_transactions",
          data: { status: "rejected", parent_response: "reason" },
        })
      );
    });

    it("passes onSuccess callback that closes modal and clears reason", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const setShowBatchRejectModal = jest.fn();
      const setBatchRejectReason = jest.fn();
      const batch = makeBatch({
        batchRejectReason: "Bad",
        setShowBatchRejectModal,
        setBatchRejectReason,
      });

      // Capture the onSuccess callback and invoke it
      (handleBatchOperation as jest.Mock).mockImplementationOnce(
        async ({ onSuccess }: { onSuccess?: () => void }) => {
          onSuccess?.();
        }
      );

      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleBatchReject();
      });

      expect(setShowBatchRejectModal).toHaveBeenCalledWith(false);
      expect(setBatchRejectReason).toHaveBeenCalledWith("");
    });
  });

  describe("handleDelete", () => {
    it("does nothing when user cancels the confirm dialog", async () => {
      confirmSpy.mockReturnValue(false);
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch();
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleDelete(makeActivity());
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("deletes the transaction and refreshes router on success", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch();
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleDelete(makeActivity({ id: "act-99" }));
      });

      expect(supabase.from).toHaveBeenCalledWith("star_transactions");
      expect(supabase._eq).toHaveBeenCalledWith("id", "act-99");
      expect(router.refresh).toHaveBeenCalled();
    });

    it("shows alert and does not refresh on Supabase error", async () => {
      const supabase = makeSupabase({ message: "DB error" });
      const router = makeRouter();
      const batch = makeBatch();
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleDelete(makeActivity());
      });

      expect(alertSpy).toHaveBeenCalledWith("activity.deleteFailed");
      expect(router.refresh).not.toHaveBeenCalled();
    });

    it("manages deletingId during the operation", async () => {
      let resolveDelete!: (val: { error: null }) => void;
      const pendingPromise = new Promise<{ error: null }>(
        (resolve) => (resolveDelete = resolve)
      );
      const eq = jest.fn().mockReturnValue(pendingPromise);
      const del = jest.fn().mockReturnValue({ eq });
      const from = jest.fn().mockReturnValue({ delete: del });
      const supabase = { from, _eq: eq } as any;
      const router = makeRouter();
      const batch = makeBatch();

      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase, router: router as any, t, locale: "en" })
      );

      // Start the delete (don't await yet)
      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.handleDelete(makeActivity({ id: "act-1" }));
      });

      // While pending, deletingId should be set
      await waitFor(() => {
        expect(result.current.deletingId).toBe("act-1");
      });

      // Resolve the DB call
      await act(async () => {
        resolveDelete({ error: null });
        await deletePromise;
      });

      // After completion, deletingId should be cleared
      expect(result.current.deletingId).toBeNull();
    });

    it("shows confirm message with stars sign prefix for positive stars", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch();
      // Use a t that serialises values so we can inspect the stars arg
      const tSerialized = (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key;
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t: tSerialized, locale: "en" })
      );

      await act(async () => {
        await result.current.handleDelete(makeActivity({ stars: 5 }));
      });

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("+5⭐")
      );
    });

    it("shows stars without + prefix for negative star values", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch();
      const tSerialized = (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key;
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t: tSerialized, locale: "en" })
      );

      await act(async () => {
        await result.current.handleDelete(makeActivity({ stars: -3 }));
      });

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("-3⭐")
      );
    });

    it("shows alert when trying to delete a non-star_transaction", async () => {
      const supabase = makeSupabase();
      const router = makeRouter();
      const batch = makeBatch();
      const { result } = renderHook(() =>
        useActivityActions({ batch, supabase: supabase as any, router: router as any, t, locale: "en" })
      );

      await act(async () => {
        await result.current.handleDelete(makeActivity({ type: "redemption" }));
      });

      expect(alertSpy).toHaveBeenCalledWith("activity.canOnlyDeleteStars");
      expect(supabase.from).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });
});
