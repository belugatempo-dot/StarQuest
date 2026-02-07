import { buildChildrenStats, fetchReportBaseData } from "@/lib/reports/report-utils";
import type { ReportRawData } from "@/lib/reports/report-utils";

// Mock Supabase admin client
const mockFrom = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

function makeChain(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.lte = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue(resolvedValue);
  return chain;
}

describe("report-utils", () => {
  describe("buildChildrenStats", () => {
    const baseRawData: ReportRawData = {
      family: { id: "fam-1", name: "Test Family" },
      children: [{ id: "child-1", name: "Alice" }],
      transactions: [],
      redemptions: [],
      balances: [],
      creditTx: [],
      pendingStars: [],
      pendingRedemptions: [],
    };

    it("returns empty arrays when no children", () => {
      const rawData = { ...baseRawData, children: [] };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData).toEqual([]);
      expect(result.totalEarned).toBe(0);
      expect(result.totalSpent).toBe(0);
    });

    it("calculates stars earned from positive transactions", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: [
          { child_id: "child-1", quest_id: "q1", stars: 5, quests: { name_en: "Quest1", name_zh: null } },
          { child_id: "child-1", quest_id: "q2", stars: 3, quests: { name_en: "Quest2", name_zh: null } },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].starsEarned).toBe(8);
      expect(result.totalEarned).toBe(8);
    });

    it("calculates stars spent from redemptions and deductions", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: [
          { child_id: "child-1", quest_id: "q1", stars: -3, quests: null },
        ],
        redemptions: [
          { child_id: "child-1", stars_spent: 10 },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].starsSpent).toBe(13); // 10 + 3
      expect(result.totalSpent).toBe(13);
    });

    it("calculates net stars", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: [
          { child_id: "child-1", quest_id: "q1", stars: 10, quests: { name_en: "Q1", name_zh: null } },
          { child_id: "child-1", quest_id: "q2", stars: -2, quests: null },
        ],
        redemptions: [
          { child_id: "child-1", stars_spent: 3 },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].netStars).toBe(5); // 10 - (3 + 2)
    });

    it("gets current balance from balances data", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        balances: [{ child_id: "child-1", current_stars: 42 }],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].currentBalance).toBe(42);
    });

    it("defaults balance to 0 when not found", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        balances: [],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].currentBalance).toBe(0);
    });

    it("calculates credit borrowed and repaid", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        creditTx: [
          { child_id: "child-1", transaction_type: "credit_used", amount: 15 },
          { child_id: "child-1", transaction_type: "credit_repaid", amount: 5 },
          { child_id: "child-1", transaction_type: "interest_charged", amount: 1 },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].creditBorrowed).toBe(15);
      expect(result.childrenData[0].creditRepaid).toBe(5);
    });

    it("builds top quests sorted by total stars", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: [
          { child_id: "child-1", quest_id: "q1", stars: 5, quests: { name_en: "Quest1", name_zh: "任务1" } },
          { child_id: "child-1", quest_id: "q1", stars: 5, quests: { name_en: "Quest1", name_zh: "任务1" } },
          { child_id: "child-1", quest_id: "q2", stars: 2, quests: { name_en: "Quest2", name_zh: null } },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].topQuests.length).toBe(2);
      expect(result.childrenData[0].topQuests[0].name).toBe("Quest1");
      expect(result.childrenData[0].topQuests[0].count).toBe(2);
      expect(result.childrenData[0].topQuests[0].stars).toBe(5);
    });

    it("uses Chinese quest names for zh-CN locale", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: [
          { child_id: "child-1", quest_id: "q1", stars: 5, quests: { name_en: "Quest1", name_zh: "任务1" } },
        ],
      };
      const result = buildChildrenStats(rawData, "zh-CN");
      expect(result.childrenData[0].topQuests[0].name).toBe("任务1");
    });

    it("falls back to English quest name when name_zh is null", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: [
          { child_id: "child-1", quest_id: "q1", stars: 5, quests: { name_en: "Quest1", name_zh: null } },
        ],
      };
      const result = buildChildrenStats(rawData, "zh-CN");
      expect(result.childrenData[0].topQuests[0].name).toBe("Quest1");
    });

    it("excludes negative-star transactions from top quests", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: [
          { child_id: "child-1", quest_id: "q1", stars: -3, quests: { name_en: "Bad", name_zh: null } },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].topQuests.length).toBe(0);
    });

    it("excludes transactions without quest_id from top quests", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: [
          { child_id: "child-1", quest_id: null, stars: 5, quests: null },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].topQuests.length).toBe(0);
    });

    it("limits top quests to 5", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: Array.from({ length: 7 }, (_, i) => ({
          child_id: "child-1",
          quest_id: `q${i}`,
          stars: 5 + i,
          quests: { name_en: `Quest${i}`, name_zh: null },
        })),
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].topQuests.length).toBe(5);
    });

    it("counts pending requests", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        pendingStars: [
          { child_id: "child-1" },
          { child_id: "child-1" },
        ],
        pendingRedemptions: [
          { child_id: "child-1" },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].pendingRequestsCount).toBe(3);
    });

    it("handles multiple children correctly", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        children: [
          { id: "child-1", name: "Alice" },
          { id: "child-2", name: "Bob" },
        ],
        transactions: [
          { child_id: "child-1", quest_id: "q1", stars: 10, quests: { name_en: "Q1", name_zh: null } },
          { child_id: "child-2", quest_id: "q1", stars: 5, quests: { name_en: "Q1", name_zh: null } },
        ],
        redemptions: [
          { child_id: "child-1", stars_spent: 3 },
        ],
        balances: [
          { child_id: "child-1", current_stars: 100 },
          { child_id: "child-2", current_stars: 50 },
        ],
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData.length).toBe(2);
      expect(result.childrenData[0].name).toBe("Alice");
      expect(result.childrenData[0].starsEarned).toBe(10);
      expect(result.childrenData[1].name).toBe("Bob");
      expect(result.childrenData[1].starsEarned).toBe(5);
      expect(result.totalEarned).toBe(15);
      expect(result.totalSpent).toBe(3);
    });

    it("handles null data arrays gracefully", () => {
      const rawData: ReportRawData = {
        ...baseRawData,
        transactions: null,
        redemptions: null,
        balances: null,
        creditTx: null,
        pendingStars: null,
        pendingRedemptions: null,
      };
      const result = buildChildrenStats(rawData, "en");
      expect(result.childrenData[0].starsEarned).toBe(0);
      expect(result.childrenData[0].starsSpent).toBe(0);
      expect(result.childrenData[0].creditBorrowed).toBe(0);
      expect(result.childrenData[0].creditRepaid).toBe(0);
      expect(result.childrenData[0].pendingRequestsCount).toBe(0);
      expect(result.childrenData[0].currentBalance).toBe(0);
    });
  });

  describe("fetchReportBaseData", () => {
    beforeEach(() => {
      mockFrom.mockReset();
      jest.spyOn(console, "error").mockImplementation();
    });

    afterEach(() => {
      (console.error as jest.Mock).mockRestore();
    });

    /**
     * Creates a mock chain for a Supabase table query.
     * All chainable methods (.select, .eq, .gte, .lte, .in) return the chain.
     * .single() returns a promise resolving to the given value.
     * The chain itself is thenable (for queries that don't end with .single()).
     */
    function makeTableChain(resolvedValue: any) {
      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.gte = jest.fn().mockReturnValue(chain);
      chain.lte = jest.fn().mockReturnValue(chain);
      chain.in = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn().mockResolvedValue(resolvedValue);
      // Make chain itself thenable so `await supabase.from(...).select(...).eq(...)` works
      chain.then = (resolve: any, reject?: any) =>
        Promise.resolve(resolvedValue).then(resolve, reject);
      return chain;
    }

    /**
     * Sets up mockFrom to return different chains based on table name.
     * For tables queried multiple times (star_transactions, redemptions),
     * the second call uses the key `${table}_2`.
     */
    function setupMockFrom(tableResponses: Record<string, any>) {
      const callCounts: Record<string, number> = {};
      mockFrom.mockImplementation((table: string) => {
        callCounts[table] = (callCounts[table] || 0) + 1;
        const key =
          callCounts[table] > 1
            ? `${table}_${callCounts[table]}`
            : table;
        const response =
          tableResponses[key] ||
          tableResponses[table] ||
          { data: null, error: null };
        return makeTableChain(response);
      });
    }

    it("returns null when family fetch fails", async () => {
      setupMockFrom({
        families: { data: null, error: { message: "not found" } },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch family:",
        expect.objectContaining({ message: "not found" })
      );
    });

    it("returns null when family data is null", async () => {
      setupMockFrom({
        families: { data: null, error: null },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).toBeNull();
    });

    it("returns null when children fetch errors", async () => {
      setupMockFrom({
        families: { data: { id: "fam-1", name: "Test" }, error: null },
        users: { data: null, error: { message: "children error" } },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch children:",
        expect.objectContaining({ message: "children error" })
      );
    });

    it("returns empty data when no children found (empty array)", async () => {
      setupMockFrom({
        families: { data: { id: "fam-1", name: "Test" }, error: null },
        users: { data: [], error: null },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).not.toBeNull();
      expect(result!.family).toEqual({ id: "fam-1", name: "Test" });
      expect(result!.children).toEqual([]);
      expect(result!.transactions).toBeNull();
      expect(result!.redemptions).toBeNull();
      expect(result!.balances).toBeNull();
      expect(result!.creditTx).toBeNull();
      expect(result!.pendingStars).toBeNull();
      expect(result!.pendingRedemptions).toBeNull();
    });

    it("returns empty data when children is null (no error)", async () => {
      setupMockFrom({
        families: { data: { id: "fam-1", name: "Test" }, error: null },
        users: { data: null, error: null },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).not.toBeNull();
      expect(result!.children).toEqual([]);
      expect(result!.transactions).toBeNull();
    });

    it("returns null when transactions fetch errors", async () => {
      setupMockFrom({
        families: { data: { id: "fam-1", name: "Test" }, error: null },
        users: { data: [{ id: "c1", name: "Alice" }], error: null },
        star_transactions: { data: null, error: { message: "tx error" } },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch transactions:",
        expect.objectContaining({ message: "tx error" })
      );
    });

    it("returns null when redemptions fetch errors", async () => {
      setupMockFrom({
        families: { data: { id: "fam-1", name: "Test" }, error: null },
        users: { data: [{ id: "c1", name: "Alice" }], error: null },
        star_transactions: { data: [], error: null },
        redemptions: { data: null, error: { message: "redemption error" } },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch redemptions:",
        expect.objectContaining({ message: "redemption error" })
      );
    });

    it("returns null when balances fetch errors", async () => {
      setupMockFrom({
        families: { data: { id: "fam-1", name: "Test" }, error: null },
        users: { data: [{ id: "c1", name: "Alice" }], error: null },
        star_transactions: { data: [], error: null },
        redemptions: { data: [], error: null },
        child_balances: { data: null, error: { message: "balance error" } },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch balances:",
        expect.objectContaining({ message: "balance error" })
      );
    });

    it("returns null when credit transactions fetch errors", async () => {
      setupMockFrom({
        families: { data: { id: "fam-1", name: "Test" }, error: null },
        users: { data: [{ id: "c1", name: "Alice" }], error: null },
        star_transactions: { data: [], error: null },
        redemptions: { data: [], error: null },
        child_balances: { data: [], error: null },
        credit_transactions: { data: null, error: { message: "credit error" } },
      });

      const result = await fetchReportBaseData("fam-1", new Date(), new Date());
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch credit transactions:",
        expect.objectContaining({ message: "credit error" })
      );
    });

    it("returns full data on success", async () => {
      setupMockFrom({
        families: { data: { id: "fam-1", name: "Test Family" }, error: null },
        users: {
          data: [
            { id: "c1", name: "Alice" },
            { id: "c2", name: "Bob" },
          ],
          error: null,
        },
        star_transactions: {
          data: [{ child_id: "c1", stars: 5, quest_id: "q1" }],
          error: null,
        },
        redemptions: {
          data: [{ child_id: "c1", stars_spent: 3 }],
          error: null,
        },
        child_balances: {
          data: [
            { child_id: "c1", current_stars: 42 },
            { child_id: "c2", current_stars: 10 },
          ],
          error: null,
        },
        credit_transactions: { data: [], error: null },
        // Second calls for pending counts
        star_transactions_2: {
          data: [{ child_id: "c1" }],
          error: null,
        },
        redemptions_2: {
          data: [{ child_id: "c2" }],
          error: null,
        },
      });

      const result = await fetchReportBaseData(
        "fam-1",
        new Date("2025-01-01"),
        new Date("2025-01-31")
      );

      expect(result).not.toBeNull();
      expect(result!.family).toEqual({ id: "fam-1", name: "Test Family" });
      expect(result!.children).toEqual([
        { id: "c1", name: "Alice" },
        { id: "c2", name: "Bob" },
      ]);
      expect(result!.transactions).toEqual([
        { child_id: "c1", stars: 5, quest_id: "q1" },
      ]);
      expect(result!.redemptions).toEqual([
        { child_id: "c1", stars_spent: 3 },
      ]);
      expect(result!.balances).toEqual([
        { child_id: "c1", current_stars: 42 },
        { child_id: "c2", current_stars: 10 },
      ]);
      expect(result!.creditTx).toEqual([]);
      expect(result!.pendingStars).toEqual([{ child_id: "c1" }]);
      expect(result!.pendingRedemptions).toEqual([{ child_id: "c2" }]);
    });

    it("passes correct date strings and child IDs to queries", async () => {
      const chains: Record<string, any> = {};
      const callCounts: Record<string, number> = {};

      mockFrom.mockImplementation((table: string) => {
        callCounts[table] = (callCounts[table] || 0) + 1;
        const key =
          callCounts[table] > 1
            ? `${table}_${callCounts[table]}`
            : table;

        let response: any;
        if (table === "families") {
          response = { data: { id: "fam-1", name: "Test" }, error: null };
        } else if (table === "users") {
          response = { data: [{ id: "c1", name: "Alice" }], error: null };
        } else {
          response = { data: [], error: null };
        }

        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.single = jest.fn().mockResolvedValue(response);
        chain.then = (resolve: any, reject?: any) =>
          Promise.resolve(response).then(resolve, reject);
        chains[key] = chain;
        return chain;
      });

      const start = new Date("2025-03-01T00:00:00.000Z");
      const end = new Date("2025-03-07T23:59:59.999Z");
      await fetchReportBaseData("fam-1", start, end);

      // Verify star_transactions query uses correct date range and child IDs
      const txChain = chains["star_transactions"];
      expect(txChain.eq).toHaveBeenCalledWith("family_id", "fam-1");
      expect(txChain.eq).toHaveBeenCalledWith("status", "approved");
      expect(txChain.gte).toHaveBeenCalledWith("created_at", start.toISOString());
      expect(txChain.lte).toHaveBeenCalledWith("created_at", end.toISOString());
      expect(txChain.in).toHaveBeenCalledWith("child_id", ["c1"]);

      // Verify pending star_transactions query uses "pending" status
      const pendingTxChain = chains["star_transactions_2"];
      expect(pendingTxChain.eq).toHaveBeenCalledWith("status", "pending");

      // Verify child_balances query uses child IDs
      const balChain = chains["child_balances"];
      expect(balChain.in).toHaveBeenCalledWith("child_id", ["c1"]);
    });
  });
});
