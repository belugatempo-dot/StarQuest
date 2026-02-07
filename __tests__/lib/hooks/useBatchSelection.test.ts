import { renderHook, act } from "@testing-library/react";
import { useBatchSelection } from "@/lib/hooks/useBatchSelection";

describe("useBatchSelection", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useBatchSelection());
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.isBatchProcessing).toBe(false);
    expect(result.current.showBatchRejectModal).toBe(false);
    expect(result.current.batchRejectReason).toBe("");
  });

  it("can toggle selection mode", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setSelectionMode(true);
    });
    expect(result.current.selectionMode).toBe(true);
  });

  it("toggleSelection adds an id", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setSelectionMode(true);
    });
    act(() => {
      result.current.toggleSelection("id-1");
    });
    expect(result.current.selectedIds.has("id-1")).toBe(true);
    expect(result.current.selectedIds.size).toBe(1);
  });

  it("toggleSelection removes an already-selected id", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setSelectionMode(true);
    });
    act(() => {
      result.current.toggleSelection("id-1");
    });
    act(() => {
      result.current.toggleSelection("id-1");
    });
    expect(result.current.selectedIds.has("id-1")).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("toggleSelection can add multiple ids", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setSelectionMode(true);
    });
    act(() => {
      result.current.toggleSelection("id-1");
    });
    act(() => {
      result.current.toggleSelection("id-2");
    });
    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.selectedIds.has("id-1")).toBe(true);
    expect(result.current.selectedIds.has("id-2")).toBe(true);
  });

  it("selectAll replaces current selection with all provided ids", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setSelectionMode(true);
    });
    act(() => {
      result.current.toggleSelection("id-1");
    });
    act(() => {
      result.current.selectAll(["id-2", "id-3", "id-4"]);
    });
    expect(result.current.selectedIds.size).toBe(3);
    expect(result.current.selectedIds.has("id-1")).toBe(false);
    expect(result.current.selectedIds.has("id-2")).toBe(true);
    expect(result.current.selectedIds.has("id-3")).toBe(true);
    expect(result.current.selectedIds.has("id-4")).toBe(true);
  });

  it("clearSelection empties the selection", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setSelectionMode(true);
    });
    act(() => {
      result.current.selectAll(["id-1", "id-2"]);
    });
    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("exitSelectionMode turns off selection mode and clears selection", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setSelectionMode(true);
    });
    act(() => {
      result.current.selectAll(["id-1", "id-2"]);
    });
    act(() => {
      result.current.exitSelectionMode();
    });
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("clears selection when selection mode is turned off", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setSelectionMode(true);
    });
    act(() => {
      result.current.selectAll(["id-1", "id-2"]);
    });
    act(() => {
      result.current.setSelectionMode(false);
    });
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("can set batch processing state", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setIsBatchProcessing(true);
    });
    expect(result.current.isBatchProcessing).toBe(true);
    act(() => {
      result.current.setIsBatchProcessing(false);
    });
    expect(result.current.isBatchProcessing).toBe(false);
  });

  it("can set batch reject modal visibility", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setShowBatchRejectModal(true);
    });
    expect(result.current.showBatchRejectModal).toBe(true);
  });

  it("can set batch reject reason", () => {
    const { result } = renderHook(() => useBatchSelection());
    act(() => {
      result.current.setBatchRejectReason("Not good enough");
    });
    expect(result.current.batchRejectReason).toBe("Not good enough");
  });
});
