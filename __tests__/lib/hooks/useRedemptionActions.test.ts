import { renderHook, act, waitFor } from "@testing-library/react";
import { useRedemptionActions } from "@/lib/hooks/useRedemptionActions";

// Mock batch-operations
const mockHandleBatchOperation = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/batch-operations", () => ({
  handleBatchOperation: (...args: any[]) => mockHandleBatchOperation(...args),
  buildApprovalPayload: jest
    .fn()
    .mockReturnValue({ status: "approved", reviewed_at: "2026-01-01T12:00:00.000Z" }),
  buildRejectionPayload: jest
    .fn()
    .mockReturnValue({ status: "rejected", parent_response: null }),
}));

// Mock date-utils
jest.mock("@/lib/date-utils", () => ({
  getTodayString: jest.fn().mockReturnValue("2026-02-21"),
  toApprovalTimestamp: jest.fn().mockImplementation((dateStr?: string) =>
    dateStr
      ? new Date(dateStr + "T12:00:00Z").toISOString()
      : new Date().toISOString()
  ),
}));

// Mock supabase helpers
const mockEq = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
jest.mock("@/lib/supabase/helpers", () => ({
  typedUpdate: (...args: any[]) => mockUpdate(...args),
}));

// Mock useBatchSelection
const mockExitSelectionMode = jest.fn();
const mockSetIsBatchProcessing = jest.fn();
const mockSetShowBatchRejectModal = jest.fn();
const mockSetBatchRejectReason = jest.fn();

jest.mock("@/lib/hooks/useBatchSelection", () => ({
  useBatchSelection: () => ({
    selectionMode: true,
    setSelectionMode: jest.fn(),
    selectedIds: new Set(["id-1", "id-2"]),
    toggleSelection: jest.fn(),
    selectAll: jest.fn(),
    clearSelection: jest.fn(),
    exitSelectionMode: mockExitSelectionMode,
    isBatchProcessing: false,
    setIsBatchProcessing: mockSetIsBatchProcessing,
    showBatchRejectModal: false,
    setShowBatchRejectModal: mockSetShowBatchRejectModal,
    batchRejectReason: "",
    setBatchRejectReason: mockSetBatchRejectReason,
  }),
}));

const mockRouter = { refresh: jest.fn() } as any;
const mockSupabase = { from: jest.fn() } as any;

const mockT = (key: string) => key;

const defaultOptions = {
  supabase: mockSupabase,
  router: mockRouter,
  t: mockT,
  parentId: "parent-1",
};

describe("useRedemptionActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
    global.console.error = jest.fn();
  });

  it("initializes with null processingId", () => {
    const { result } = renderHook(() => useRedemptionActions(defaultOptions));
    expect(result.current.processingId).toBeNull();
  });

  it("initializes with null showApproveModal", () => {
    const { result } = renderHook(() => useRedemptionActions(defaultOptions));
    expect(result.current.showApproveModal).toBeNull();
  });

  it("initializes with null showRejectModal", () => {
    const { result } = renderHook(() => useRedemptionActions(defaultOptions));
    expect(result.current.showRejectModal).toBeNull();
  });

  it("initializes with empty rejectReason", () => {
    const { result } = renderHook(() => useRedemptionActions(defaultOptions));
    expect(result.current.rejectReason).toBe("");
  });

  it("provides batch selection return", () => {
    const { result } = renderHook(() => useRedemptionActions(defaultOptions));
    expect(result.current.batch).toBeDefined();
    expect(result.current.batch.selectedIds).toBeDefined();
  });

  describe("Individual approve", () => {
    it("openApproveModal sets showApproveModal to the given id", () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openApproveModal("req-1"));
      expect(result.current.showApproveModal).toBe("req-1");
    });

    it("closeApproveModal clears showApproveModal", () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openApproveModal("req-1"));
      act(() => result.current.closeApproveModal());
      expect(result.current.showApproveModal).toBeNull();
    });

    it("confirmApprove calls typedUpdate with correct data", async () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openApproveModal("req-1"));

      await act(async () => {
        await result.current.confirmApprove();
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        mockSupabase,
        "redemptions",
        expect.objectContaining({ status: "approved" })
      );
      expect(mockEq).toHaveBeenCalledWith("id", "req-1");
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it("confirmApprove does nothing when showApproveModal is null", async () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.confirmApprove();
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("confirmApprove shows alert on error", async () => {
      mockEq.mockResolvedValueOnce({ error: { message: "DB error" } });
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openApproveModal("req-1"));

      await act(async () => {
        await result.current.confirmApprove();
      });

      expect(global.alert).toHaveBeenCalledWith("Failed to approve redemption");
    });

    it("confirmApprove resets processingId after error", async () => {
      mockEq.mockResolvedValueOnce({ error: { message: "DB error" } });
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openApproveModal("req-1"));

      await act(async () => {
        await result.current.confirmApprove();
      });

      expect(result.current.processingId).toBeNull();
    });

    it("setApprovalDate updates approvalDate", () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.setApprovalDate("2026-01-15"));
      expect(result.current.approvalDate).toBe("2026-01-15");
    });
  });

  describe("Individual reject", () => {
    it("openRejectModal sets showRejectModal to given id", () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openRejectModal("req-2"));
      expect(result.current.showRejectModal).toBe("req-2");
    });

    it("closeRejectModal clears modal and rejectReason", () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openRejectModal("req-2"));
      act(() => result.current.setRejectReason("some reason"));
      act(() => result.current.closeRejectModal());

      expect(result.current.showRejectModal).toBeNull();
      expect(result.current.rejectReason).toBe("");
    });

    it("confirmReject calls typedUpdate with correct data", async () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openRejectModal("req-2"));
      act(() => result.current.setRejectReason("Not appropriate"));

      await act(async () => {
        await result.current.confirmReject();
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        mockSupabase,
        "redemptions",
        expect.objectContaining({
          status: "rejected",
          parent_response: "Not appropriate",
        })
      );
      expect(mockEq).toHaveBeenCalledWith("id", "req-2");
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it("confirmReject does nothing when showRejectModal is null", async () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.confirmReject();
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("confirmReject sends null parent_response for empty reason", async () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openRejectModal("req-2"));

      await act(async () => {
        await result.current.confirmReject();
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        mockSupabase,
        "redemptions",
        expect.objectContaining({ parent_response: null })
      );
    });

    it("confirmReject shows alert on error", async () => {
      mockEq.mockResolvedValueOnce({ error: { message: "DB error" } });
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openRejectModal("req-2"));

      await act(async () => {
        await result.current.confirmReject();
      });

      expect(global.alert).toHaveBeenCalledWith("Failed to reject redemption");
    });

    it("confirmReject resets processingId after error", async () => {
      mockEq.mockResolvedValueOnce({ error: { message: "DB error" } });
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openRejectModal("req-2"));

      await act(async () => {
        await result.current.confirmReject();
      });

      expect(result.current.processingId).toBeNull();
    });
  });

  describe("Batch approve", () => {
    it("openBatchApproveModal sets showBatchApproveModal to true", () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openBatchApproveModal());
      expect(result.current.showBatchApproveModal).toBe(true);
    });

    it("openBatchApproveModal does nothing when selectedIds is empty", () => {
      // Override with empty selection
      const emptyBatchMock = jest.requireMock("@/lib/hooks/useBatchSelection");
      const original = emptyBatchMock.useBatchSelection;
      emptyBatchMock.useBatchSelection = () => ({
        ...original(),
        selectedIds: new Set(),
      });

      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openBatchApproveModal());
      expect(result.current.showBatchApproveModal).toBe(false);

      emptyBatchMock.useBatchSelection = original;
    });

    it("closeBatchApproveModal sets showBatchApproveModal to false", () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openBatchApproveModal());
      act(() => result.current.closeBatchApproveModal());
      expect(result.current.showBatchApproveModal).toBe(false);
    });

    it("confirmBatchApprove calls handleBatchOperation", async () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.confirmBatchApprove();
      });

      expect(mockHandleBatchOperation).toHaveBeenCalledWith(
        expect.objectContaining({ table: "redemptions" })
      );
    });

    it("confirmBatchApprove does nothing when selectedIds is empty", async () => {
      const emptyBatchMock = jest.requireMock("@/lib/hooks/useBatchSelection");
      const original = emptyBatchMock.useBatchSelection;
      emptyBatchMock.useBatchSelection = () => ({
        ...original(),
        selectedIds: new Set(),
      });

      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.confirmBatchApprove();
      });

      expect(mockHandleBatchOperation).not.toHaveBeenCalled();

      emptyBatchMock.useBatchSelection = original;
    });

    it("setBatchApprovalDate updates batchApprovalDate", () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.setBatchApprovalDate("2026-01-05"));
      expect(result.current.batchApprovalDate).toBe("2026-01-05");
    });
  });

  describe("Batch reject", () => {
    it("handleBatchReject calls handleBatchOperation", async () => {
      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.handleBatchReject();
      });

      expect(mockHandleBatchOperation).toHaveBeenCalledWith(
        expect.objectContaining({ table: "redemptions" })
      );
    });

    it("handleBatchReject does nothing when selectedIds is empty", async () => {
      const emptyBatchMock = jest.requireMock("@/lib/hooks/useBatchSelection");
      const original = emptyBatchMock.useBatchSelection;
      emptyBatchMock.useBatchSelection = () => ({
        ...original(),
        selectedIds: new Set(),
      });

      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.handleBatchReject();
      });

      expect(mockHandleBatchOperation).not.toHaveBeenCalled();

      emptyBatchMock.useBatchSelection = original;
    });
  });

  describe("Error messages via t()", () => {
    it("shows i18n alert on batch approve error", async () => {
      mockHandleBatchOperation.mockImplementationOnce(async (opts: any) => {
        opts.onError?.("error");
      });

      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.confirmBatchApprove();
      });

      expect(global.alert).toHaveBeenCalledWith("admin.batchApproveFailed");
    });

    it("shows i18n alert on batch reject error", async () => {
      mockHandleBatchOperation.mockImplementationOnce(async (opts: any) => {
        opts.onError?.("error");
      });

      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.handleBatchReject();
      });

      expect(global.alert).toHaveBeenCalledWith("admin.batchRejectFailed");
    });
  });

  describe("Batch approve onSuccess callback", () => {
    it("closes batch approve modal on success", async () => {
      mockHandleBatchOperation.mockImplementationOnce(async (opts: any) => {
        opts.onSuccess?.();
      });

      const { result } = renderHook(() => useRedemptionActions(defaultOptions));
      act(() => result.current.openBatchApproveModal());

      await act(async () => {
        await result.current.confirmBatchApprove();
      });

      expect(result.current.showBatchApproveModal).toBe(false);
    });
  });

  describe("Batch reject onSuccess callback", () => {
    it("closes batch reject modal and clears reason on success", async () => {
      mockHandleBatchOperation.mockImplementationOnce(async (opts: any) => {
        opts.onSuccess?.();
      });

      const { result } = renderHook(() => useRedemptionActions(defaultOptions));

      await act(async () => {
        await result.current.handleBatchReject();
      });

      expect(mockSetShowBatchRejectModal).toHaveBeenCalledWith(false);
      expect(mockSetBatchRejectReason).toHaveBeenCalledWith("");
    });
  });
});
