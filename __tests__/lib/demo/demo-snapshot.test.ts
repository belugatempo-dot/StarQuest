/**
 * Tests for lib/demo/demo-snapshot.ts — save/restore snapshot wrappers.
 */

import {
  saveDemoSnapshot,
  restoreDemoData,
  getSnapshotLatestDate,
} from "@/lib/demo/demo-snapshot";

function makeChain(resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  return chain;
}

function createMockSupabase() {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();
  return {
    client: { rpc: mockRpc, from: mockFrom } as any,
    mockRpc,
    mockFrom,
  };
}

// ---- saveDemoSnapshot ----
describe("saveDemoSnapshot", () => {
  it("calls save_demo_snapshot RPC with family_id", async () => {
    const { client, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: null, error: null });

    await saveDemoSnapshot(client, "fam-123");

    expect(mockRpc).toHaveBeenCalledWith("save_demo_snapshot", {
      p_family_id: "fam-123",
    });
  });

  it("throws when RPC returns an error", async () => {
    const { client, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Permission denied" },
    });

    await expect(saveDemoSnapshot(client, "fam-123")).rejects.toThrow(
      "Failed to save demo snapshot: Permission denied"
    );
  });

  it("resolves when RPC succeeds", async () => {
    const { client, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(saveDemoSnapshot(client, "fam-456")).resolves.toBeUndefined();
  });
});

// ---- restoreDemoData ----
describe("restoreDemoData", () => {
  it("calls restore_demo_data RPC with no params", async () => {
    const { client, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: null, error: null });

    await restoreDemoData(client);

    expect(mockRpc).toHaveBeenCalledWith("restore_demo_data");
  });

  it("throws when RPC returns an error", async () => {
    const { client, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "No demo snapshot found" },
    });

    await expect(restoreDemoData(client)).rejects.toThrow(
      "Failed to restore demo data: No demo snapshot found"
    );
  });

  it("resolves when RPC succeeds", async () => {
    const { client, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(restoreDemoData(client)).resolves.toBeUndefined();
  });
});

// ---- getSnapshotLatestDate ----
describe("getSnapshotLatestDate", () => {
  it("queries demo_data_snapshot for star_transactions rows", async () => {
    const { client, mockFrom } = createMockSupabase();
    const chain = makeChain({
      data: {
        rows: [
          { created_at: "2026-01-15T10:00:00Z" },
          { created_at: "2026-01-20T14:00:00Z" },
        ],
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await getSnapshotLatestDate(client);

    expect(mockFrom).toHaveBeenCalledWith("demo_data_snapshot");
    expect(chain.select).toHaveBeenCalledWith("rows");
    expect(chain.eq).toHaveBeenCalledWith("table_name", "star_transactions");
    expect(chain.maybeSingle).toHaveBeenCalled();
  });

  it("returns the latest date from star_transactions rows", async () => {
    const { client, mockFrom } = createMockSupabase();
    const chain = makeChain({
      data: {
        rows: [
          { created_at: "2026-01-10T08:00:00Z" },
          { created_at: "2026-01-20T14:30:00Z" },
          { created_at: "2026-01-15T12:00:00Z" },
        ],
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await getSnapshotLatestDate(client);

    expect(result).toEqual(new Date("2026-01-20T14:30:00Z"));
  });

  it("returns null when no snapshot exists", async () => {
    const { client, mockFrom } = createMockSupabase();
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getSnapshotLatestDate(client);

    expect(result).toBeNull();
  });

  it("returns null when rows array is empty", async () => {
    const { client, mockFrom } = createMockSupabase();
    const chain = makeChain({ data: { rows: [] }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getSnapshotLatestDate(client);

    expect(result).toBeNull();
  });

  it("throws when query returns an error", async () => {
    const { client, mockFrom } = createMockSupabase();
    const chain = makeChain({
      data: null,
      error: { message: "Table not found" },
    });
    mockFrom.mockReturnValue(chain);

    await expect(getSnapshotLatestDate(client)).rejects.toThrow(
      "Failed to read snapshot: Table not found"
    );
  });

  it("returns null when rows is not an array", async () => {
    const { client, mockFrom } = createMockSupabase();
    const chain = makeChain({ data: { rows: "not-an-array" }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getSnapshotLatestDate(client);

    expect(result).toBeNull();
  });
});
