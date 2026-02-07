import {
  executeBatchUpdate,
  handleBatchOperation,
  buildApprovalPayload,
  buildRejectionPayload,
} from "@/lib/batch-operations";

// Mock supabase helpers
const mockInChain = jest.fn();
const mockTypedUpdate = jest.fn().mockReturnValue({
  in: mockInChain,
});
jest.mock("@/lib/supabase/helpers", () => ({
  typedUpdate: (...args: any[]) => mockTypedUpdate(...args),
}));

describe("batch-operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInChain.mockResolvedValue({ error: null });
  });

  describe("buildApprovalPayload", () => {
    it("builds payload with default values", () => {
      const result = buildApprovalPayload();
      expect(result).toEqual({
        status: "approved",
        reviewed_at: expect.any(String),
      });
    });

    it("includes reviewedBy when provided", () => {
      const result = buildApprovalPayload("parent-1");
      expect(result).toEqual({
        status: "approved",
        reviewed_by: "parent-1",
        reviewed_at: expect.any(String),
      });
    });

    it("uses custom reviewedAt when provided", () => {
      const customDate = "2025-01-15T12:00:00Z";
      const result = buildApprovalPayload(undefined, customDate);
      expect(result).toEqual({
        status: "approved",
        reviewed_at: customDate,
      });
    });

    it("uses both reviewedBy and reviewedAt when provided", () => {
      const customDate = "2025-01-15T12:00:00Z";
      const result = buildApprovalPayload("parent-1", customDate);
      expect(result).toEqual({
        status: "approved",
        reviewed_by: "parent-1",
        reviewed_at: customDate,
      });
    });
  });

  describe("buildRejectionPayload", () => {
    it("builds payload with reason", () => {
      const result = buildRejectionPayload("Not valid");
      expect(result).toEqual({
        status: "rejected",
        parent_response: "Not valid",
        reviewed_at: expect.any(String),
      });
    });

    it("trims reason whitespace", () => {
      const result = buildRejectionPayload("  spaced  ");
      expect(result).toEqual({
        status: "rejected",
        parent_response: "spaced",
        reviewed_at: expect.any(String),
      });
    });

    it("passes null for empty reason", () => {
      const result = buildRejectionPayload("");
      expect(result).toEqual({
        status: "rejected",
        parent_response: null,
        reviewed_at: expect.any(String),
      });
    });

    it("passes null for whitespace-only reason", () => {
      const result = buildRejectionPayload("   ");
      expect(result).toEqual({
        status: "rejected",
        parent_response: null,
        reviewed_at: expect.any(String),
      });
    });

    it("includes reviewedBy when provided", () => {
      const result = buildRejectionPayload("Bad", "parent-1");
      expect(result).toEqual({
        status: "rejected",
        parent_response: "Bad",
        reviewed_by: "parent-1",
        reviewed_at: expect.any(String),
      });
    });

    it("uses custom reviewedAt when provided", () => {
      const customDate = "2025-01-15T12:00:00Z";
      const result = buildRejectionPayload("Bad", undefined, customDate);
      expect(result).toEqual({
        status: "rejected",
        parent_response: "Bad",
        reviewed_at: customDate,
      });
    });
  });

  describe("executeBatchUpdate", () => {
    const mockSupabase = {} as any;

    it("calls typedUpdate with correct args and returns success", async () => {
      const ids = ["id-1", "id-2"];
      const data = { status: "approved" };

      const result = await executeBatchUpdate({
        supabase: mockSupabase,
        table: "star_transactions",
        ids,
        data,
      });

      expect(mockTypedUpdate).toHaveBeenCalledWith(
        mockSupabase,
        "star_transactions",
        data
      );
      expect(mockInChain).toHaveBeenCalledWith("id", ids);
      expect(result).toEqual({ success: true });
    });

    it("returns error when update fails", async () => {
      const error = { message: "DB error" };
      mockInChain.mockResolvedValueOnce({ error });

      const result = await executeBatchUpdate({
        supabase: mockSupabase,
        table: "redemptions",
        ids: ["id-1"],
        data: { status: "rejected" },
      });

      expect(result).toEqual({ success: false, error });
    });
  });

  describe("handleBatchOperation", () => {
    const mockSupabase = {} as any;
    const mockRouter = { refresh: jest.fn() };

    function createMockBatch(selectedIds: string[] = []) {
      return {
        selectedIds: new Set(selectedIds),
        setIsBatchProcessing: jest.fn(),
        exitSelectionMode: jest.fn(),
        setShowBatchRejectModal: jest.fn(),
        setBatchRejectReason: jest.fn(),
      };
    }

    it("no-ops when selectedIds is empty", async () => {
      const batch = createMockBatch([]);

      await handleBatchOperation({
        batch,
        supabase: mockSupabase,
        router: mockRouter as any,
        table: "star_transactions",
        data: { status: "approved" },
      });

      expect(batch.setIsBatchProcessing).not.toHaveBeenCalled();
      expect(mockTypedUpdate).not.toHaveBeenCalled();
    });

    it("sets processing true then false on success", async () => {
      const batch = createMockBatch(["id-1"]);
      const calls: boolean[] = [];
      batch.setIsBatchProcessing.mockImplementation((v: boolean) => calls.push(v));

      await handleBatchOperation({
        batch,
        supabase: mockSupabase,
        router: mockRouter as any,
        table: "star_transactions",
        data: { status: "approved" },
      });

      expect(calls).toEqual([true, false]);
    });

    it("calls exitSelectionMode and router.refresh on success", async () => {
      const batch = createMockBatch(["id-1"]);

      await handleBatchOperation({
        batch,
        supabase: mockSupabase,
        router: mockRouter as any,
        table: "star_transactions",
        data: { status: "approved" },
      });

      expect(batch.exitSelectionMode).toHaveBeenCalled();
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it("calls onSuccess callback when provided", async () => {
      const batch = createMockBatch(["id-1"]);
      const onSuccess = jest.fn();

      await handleBatchOperation({
        batch,
        supabase: mockSupabase,
        router: mockRouter as any,
        table: "star_transactions",
        data: { status: "approved" },
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it("calls onError on failure", async () => {
      const error = { message: "Failed" };
      mockInChain.mockResolvedValueOnce({ error });

      const batch = createMockBatch(["id-1"]);
      const onError = jest.fn();

      await handleBatchOperation({
        batch,
        supabase: mockSupabase,
        router: mockRouter as any,
        table: "star_transactions",
        data: { status: "approved" },
        onError,
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(batch.exitSelectionMode).not.toHaveBeenCalled();
      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });

    it("sets processing false even on failure", async () => {
      mockInChain.mockResolvedValueOnce({ error: { message: "fail" } });

      const batch = createMockBatch(["id-1"]);
      const calls: boolean[] = [];
      batch.setIsBatchProcessing.mockImplementation((v: boolean) => calls.push(v));

      await handleBatchOperation({
        batch,
        supabase: mockSupabase,
        router: mockRouter as any,
        table: "star_transactions",
        data: { status: "approved" },
        onError: jest.fn(),
      });

      expect(calls).toEqual([true, false]);
    });

    it("passes correct ids to executeBatchUpdate", async () => {
      const batch = createMockBatch(["id-a", "id-b", "id-c"]);

      await handleBatchOperation({
        batch,
        supabase: mockSupabase,
        router: mockRouter as any,
        table: "star_transactions",
        data: { status: "approved" },
      });

      expect(mockInChain).toHaveBeenCalledWith(
        "id",
        expect.arrayContaining(["id-a", "id-b", "id-c"])
      );
    });

    it("does not call exitSelectionMode on failure", async () => {
      mockInChain.mockResolvedValueOnce({ error: { message: "fail" } });
      const batch = createMockBatch(["id-1"]);

      await handleBatchOperation({
        batch,
        supabase: mockSupabase,
        router: mockRouter as any,
        table: "star_transactions",
        data: { status: "approved" },
        onError: jest.fn(),
      });

      expect(batch.exitSelectionMode).not.toHaveBeenCalled();
    });
  });
});
