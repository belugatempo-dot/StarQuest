/**
 * Tests for lib/demo/demo-cleanup.ts
 */

import { cleanupDemoFamily } from "@/lib/demo/demo-cleanup";

// ---- Chain mock helper ----
function makeChain(resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.delete = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(resolvedValue).then(resolve, reject)) as unknown as jest.Mock;
  return chain;
}

function createMockSupabase() {
  const mockFrom = jest.fn();
  const mockDeleteUser = jest.fn();

  return {
    client: {
      from: mockFrom,
      auth: {
        admin: {
          deleteUser: mockDeleteUser,
        },
      },
    } as any,
    mockFrom,
    mockDeleteUser,
  };
}

describe("cleanupDemoFamily", () => {
  it("returns found=false when no demo parent exists", async () => {
    const { client, mockFrom } = createMockSupabase();
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    const result = await cleanupDemoFamily(client);

    expect(result).toEqual({ found: false, familyId: null, deletedAuthUsers: 0 });
  });

  it("returns found=false when parent has no family_id", async () => {
    const { client, mockFrom } = createMockSupabase();
    mockFrom.mockReturnValue(
      makeChain({ data: { id: "user-1", family_id: null }, error: null })
    );

    const result = await cleanupDemoFamily(client);

    expect(result).toEqual({ found: false, familyId: null, deletedAuthUsers: 0 });
  });

  it("deletes all tables in order and auth users when demo family exists", async () => {
    const { client, mockFrom, mockDeleteUser } = createMockSupabase();

    // First call: find parent
    const parentChain = makeChain({
      data: { id: "parent-1", family_id: "fam-1" },
      error: null,
    });
    // Second call: get family users
    const usersChain = makeChain({
      data: [{ id: "parent-1" }, { id: "child-1" }, { id: "child-2" }],
      error: null,
    });
    // Remaining calls: delete from each table
    const deleteChain = makeChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return parentChain;
      if (callCount === 2) return usersChain;
      return deleteChain;
    });

    mockDeleteUser
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    const result = await cleanupDemoFamily(client);

    expect(result).toEqual({
      found: true,
      familyId: "fam-1",
      deletedAuthUsers: 3,
    });

    // Verify tables deleted in order
    const fromCalls = mockFrom.mock.calls.slice(2); // skip parent lookup + users lookup
    const tableNames = fromCalls.map((c: string[]) => c[0]);
    expect(tableNames).toEqual([
      "credit_transactions",
      "credit_settlements",
      "child_credit_settings",
      "credit_interest_tiers",
      "star_transactions",
      "redemptions",
      "report_history",
      "family_report_preferences",
      "family_invites",
      "rewards",
      "quests",
      "levels",
      "quest_categories",
      "users",
      "families",
    ]);

    // Verify families uses "id" column, others use "family_id"
    const familiesDeleteCall = deleteChain.eq.mock.calls.find(
      (c: string[]) => c[0] === "id" && c[1] === "fam-1"
    );
    expect(familiesDeleteCall).toBeTruthy();
  });

  it("counts auth user deletions correctly when some fail", async () => {
    const { client, mockFrom, mockDeleteUser } = createMockSupabase();

    const parentChain = makeChain({
      data: { id: "parent-1", family_id: "fam-1" },
      error: null,
    });
    const usersChain = makeChain({
      data: [{ id: "parent-1" }, { id: "child-1" }],
      error: null,
    });
    const deleteChain = makeChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return parentChain;
      if (callCount === 2) return usersChain;
      return deleteChain;
    });

    mockDeleteUser
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "Not found" } });

    const result = await cleanupDemoFamily(client);

    expect(result.deletedAuthUsers).toBe(1);
  });

  it("handles null familyUsers gracefully", async () => {
    const { client, mockFrom, mockDeleteUser } = createMockSupabase();

    const parentChain = makeChain({
      data: { id: "parent-1", family_id: "fam-1" },
      error: null,
    });
    // familyUsers returns null
    const usersChain = makeChain({
      data: null,
      error: null,
    });
    const deleteChain = makeChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return parentChain;
      if (callCount === 2) return usersChain;
      return deleteChain;
    });

    const result = await cleanupDemoFamily(client);

    expect(result.deletedAuthUsers).toBe(0);
    // deleteUser should never be called
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });
});
