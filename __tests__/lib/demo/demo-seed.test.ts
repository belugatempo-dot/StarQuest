/**
 * Tests for lib/demo/demo-seed.ts
 */

// ---- Mock env ----
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    DEMO_PARENT_PASSWORD: "TestParentPass123!",
  };
});
afterEach(() => {
  process.env = originalEnv;
});

import { seedDemoFamily, createRng } from "@/lib/demo/demo-seed";
import {
  DEMO_PARENT_EMAIL,
  DEMO_FAMILY_NAME,
  DEMO_PARENT_NAME,
  DEMO_CHILDREN,
} from "@/lib/demo/demo-config";

// ---- Chain mock helper ----
function makeChain(resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockResolvedValue(resolvedValue);
  chain.delete = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(resolvedValue).then(resolve, reject)) as unknown as jest.Mock;
  return chain;
}

function createMockSupabase() {
  const mockFrom = jest.fn();
  const mockRpc = jest.fn();
  const mockCreateUser = jest.fn();

  return {
    client: {
      from: mockFrom,
      rpc: mockRpc,
      auth: {
        admin: {
          createUser: mockCreateUser,
        },
      },
    } as any,
    mockFrom,
    mockRpc,
    mockCreateUser,
  };
}

// ---- createRng tests ----
describe("createRng", () => {
  it("produces deterministic sequences", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it("produces values between 0 and 1", () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("different seeds produce different sequences", () => {
    const rng1 = createRng(1);
    const rng2 = createRng(2);

    const v1 = rng1();
    const v2 = rng2();

    expect(v1).not.toBe(v2);
  });
});

// ---- seedDemoFamily tests ----
describe("seedDemoFamily", () => {
  it("throws when DEMO_PARENT_PASSWORD is missing", async () => {
    delete process.env.DEMO_PARENT_PASSWORD;
    const { client } = createMockSupabase();

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "DEMO_PARENT_PASSWORD environment variable is required"
    );
  });

  it("throws when parent auth user creation fails", async () => {
    const { client, mockCreateUser } = createMockSupabase();
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Email already exists" },
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to create parent auth user: Email already exists"
    );
  });

  it("throws when parent auth returns null user without error", async () => {
    const { client, mockCreateUser } = createMockSupabase();
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to create parent auth user: unknown"
    );
  });

  it("throws when family RPC fails", async () => {
    const { client, mockCreateUser, mockRpc } = createMockSupabase();
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "RPC failed" },
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to create family: RPC failed"
    );
  });

  it("throws when family RPC returns null without error", async () => {
    const { client, mockCreateUser, mockRpc } = createMockSupabase();
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to create family: no family_id returned"
    );
  });

  it("throws when child auth user creation fails", async () => {
    const { client, mockCreateUser, mockRpc } = createMockSupabase();

    // Parent succeeds
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    // Family RPC succeeds
    mockRpc.mockResolvedValueOnce({
      data: "fam-1",
      error: null,
    });
    // First child fails
    mockCreateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Child email in use" },
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to create child auth user Alisa: Child email in use"
    );
  });

  it("throws when child user insert fails", async () => {
    const { client, mockCreateUser, mockRpc, mockFrom } = createMockSupabase();

    mockCreateUser.mockResolvedValue({
      data: { user: { id: "child-1" } },
      error: null,
    });
    // Override parent creation
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: "fam-1", error: null });

    // user insert fails
    const insertChain = makeChain({ data: null, error: { message: "Insert failed" } });
    mockFrom.mockReturnValue(insertChain);

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to insert child user Alisa: Insert failed"
    );
  });

  it("throws when no quests found", async () => {
    const { client, mockCreateUser, mockRpc, mockFrom } = createMockSupabase();

    // Parent
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    // Family
    mockRpc.mockResolvedValueOnce({ data: "fam-1", error: null });
    // Children
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "child-1" } },
      error: null,
    });

    // user inserts succeed, quest/reward selects return empty
    const insertOkChain = makeChain({ data: null, error: null });
    const emptySelectChain = makeChain({ data: [], error: null });

    let fromCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCallCount++;
      if (table === "users") return insertOkChain;
      return emptySelectChain;
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "No quests or rewards found after family creation"
    );
  });

  it("successfully seeds demo family with full data", async () => {
    const { client, mockCreateUser, mockRpc, mockFrom } = createMockSupabase();

    // Parent auth
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    // Family RPC
    mockRpc.mockResolvedValueOnce({ data: "fam-1", error: null });
    // Child 1 auth
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "child-1" } },
      error: null,
    });
    // Child 2 auth
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "child-2" } },
      error: null,
    });
    // Interest tiers RPC
    mockRpc.mockResolvedValue({ data: null, error: null });

    // Mock quests with all three types
    const mockQuests = [
      { id: "q1", type: "duty", stars: 2, name_en: "Brush teeth", is_active: true },
      { id: "q2", type: "bonus", stars: 3, name_en: "Read a book", is_active: true },
      { id: "q3", type: "bonus", stars: 5, name_en: "Help cooking", is_active: true },
      { id: "q4", type: "violation", stars: 3, name_en: "Fighting", is_active: true },
    ];
    const mockRewards = [
      { id: "r1", stars_cost: 10, name_en: "Screen time", is_active: true },
      { id: "r2", stars_cost: 20, name_en: "New toy", is_active: true },
      { id: "r3", stars_cost: 15, name_en: "Ice cream", is_active: true },
      { id: "r4", stars_cost: 30, name_en: "Movie night", is_active: true },
    ];

    const insertOk = makeChain({ data: null, error: null });
    const questsChain = makeChain({ data: mockQuests, error: null });
    const rewardsChain = makeChain({ data: mockRewards, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quests") return questsChain;
      if (table === "rewards") return rewardsChain;
      return insertOk;
    });

    const result = await seedDemoFamily(client);

    // Verify structure
    expect(result.familyId).toBe("fam-1");
    expect(result.parentId).toBe("parent-1");
    expect(result.children).toHaveLength(2);
    expect(result.children[0].name).toBe("Alisa");
    expect(result.children[0].userId).toBe("child-1");
    expect(result.children[1].name).toBe("Alexander");
    expect(result.children[1].userId).toBe("child-2");
    expect(result.stats.days).toBe(30);
    expect(result.stats.transactions).toBeGreaterThan(0);
    expect(result.stats.redemptions).toBeGreaterThan(0);

    // Verify parent was created with correct params
    expect(mockCreateUser.mock.calls[0][0]).toEqual({
      email: DEMO_PARENT_EMAIL,
      password: "TestParentPass123!",
      email_confirm: true,
    });

    // Verify family RPC called with correct params
    expect(mockRpc.mock.calls[0]).toEqual([
      "create_family_with_templates",
      {
        p_user_id: "parent-1",
        p_family_name: DEMO_FAMILY_NAME,
        p_user_name: DEMO_PARENT_NAME,
        p_user_email: DEMO_PARENT_EMAIL,
        p_user_locale: "en",
      },
    ]);

    // Verify children auth created
    expect(mockCreateUser.mock.calls[1][0].email).toBe(DEMO_CHILDREN[0].email);
    expect(mockCreateUser.mock.calls[2][0].email).toBe(DEMO_CHILDREN[1].email);

    // Verify report preferences inserted
    const reportCalls = mockFrom.mock.calls.filter(
      (c: string[]) => c[0] === "family_report_preferences"
    );
    expect(reportCalls.length).toBeGreaterThan(0);
  });

  it("throws when transaction insert fails", async () => {
    const { client, mockCreateUser, mockRpc, mockFrom } = createMockSupabase();

    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: "fam-1", error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "child-1" } },
      error: null,
    });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "child-2" } },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const mockQuests = [
      { id: "q1", type: "bonus", stars: 3, name_en: "Read", is_active: true },
    ];
    const mockRewards = [
      { id: "r1", stars_cost: 10, name_en: "Treat", is_active: true },
    ];

    const insertOk = makeChain({ data: null, error: null });
    const questsChain = makeChain({ data: mockQuests, error: null });
    const rewardsChain = makeChain({ data: mockRewards, error: null });
    const insertFail = makeChain({ data: null, error: { message: "Batch insert failed" } });

    let starTxCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "quests") return questsChain;
      if (table === "rewards") return rewardsChain;
      if (table === "star_transactions") {
        starTxCallCount++;
        return insertFail;
      }
      return insertOk;
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to insert transactions for Alisa: Batch insert failed"
    );
  });

  it("throws when redemption insert fails", async () => {
    const { client, mockCreateUser, mockRpc, mockFrom } = createMockSupabase();

    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: "fam-1", error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "child-1" } },
      error: null,
    });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "child-2" } },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const mockQuests = [
      { id: "q1", type: "bonus", stars: 3, name_en: "Read", is_active: true },
    ];
    const mockRewards = [
      { id: "r1", stars_cost: 10, name_en: "Treat", is_active: true },
    ];

    const insertOk = makeChain({ data: null, error: null });
    const questsChain = makeChain({ data: mockQuests, error: null });
    const rewardsChain = makeChain({ data: mockRewards, error: null });
    const insertFail = makeChain({ data: null, error: { message: "Redemption insert failed" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quests") return questsChain;
      if (table === "rewards") return rewardsChain;
      if (table === "redemptions") return insertFail;
      return insertOk;
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to insert redemptions for Alisa: Redemption insert failed"
    );
  });

  it("throws when credit settings insert fails for Alexander", async () => {
    const { client, mockCreateUser, mockRpc, mockFrom } = createMockSupabase();

    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: "fam-1", error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "child-1" } },
      error: null,
    });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "child-2" } },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const mockQuests = [
      { id: "q1", type: "bonus", stars: 3, name_en: "Read", is_active: true },
    ];
    const mockRewards = [
      { id: "r1", stars_cost: 10, name_en: "Treat", is_active: true },
    ];

    const insertOk = makeChain({ data: null, error: null });
    const questsChain = makeChain({ data: mockQuests, error: null });
    const rewardsChain = makeChain({ data: mockRewards, error: null });
    const creditFail = makeChain({ data: null, error: { message: "Credit setup failed" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quests") return questsChain;
      if (table === "rewards") return rewardsChain;
      if (table === "child_credit_settings") return creditFail;
      return insertOk;
    });

    await expect(seedDemoFamily(client)).rejects.toThrow(
      "Failed to set up credit for Alexander: Credit setup failed"
    );
  });
});
