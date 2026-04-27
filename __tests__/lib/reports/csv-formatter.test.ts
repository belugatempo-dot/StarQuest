import { generateCsvReport } from "@/lib/reports/csv-formatter";
import type { ReportRawData } from "@/lib/reports/report-utils";

describe("generateCsvReport", () => {
  const baseTx = {
    child_id: "c1",
    quest_id: "q1",
    stars: 5,
    status: "approved",
    created_at: "2026-02-10T10:30:00.000Z",
    quests: { name_en: "Read 30 min", name_zh: "阅读30分钟" },
  };

  const baseRedemption = {
    child_id: "c1",
    stars_spent: 50,
    status: "approved",
    created_at: "2026-02-11T14:00:00.000Z",
    rewards: { name_en: "Ice Cream", name_zh: "冰淇淋" },
  };

  const baseCreditTx = {
    child_id: "c1",
    transaction_type: "credit_used",
    amount: 20,
    created_at: "2026-02-12T09:00:00.000Z",
  };

  const baseRawData: ReportRawData = {
    family: { id: "f1", name: "Test Family" },
    children: [{ id: "c1", name: "Emma" }],
    transactions: [baseTx],
    redemptions: [baseRedemption],
    balances: [],
    creditTx: [baseCreditTx],
    pendingStars: [],
    pendingRedemptions: [],
  };

  it("returns CSV with header row", () => {
    const csv = generateCsvReport(baseRawData, "en");
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Time,Child,Type,Name,Stars,Status");
  });

  it("includes star transaction row", () => {
    const csv = generateCsvReport(baseRawData, "en");
    expect(csv).toContain("2026-02-10");
    expect(csv).toContain("Emma");
    expect(csv).toContain("star");
    expect(csv).toContain("Read 30 min");
    expect(csv).toContain("5");
    expect(csv).toContain("approved");
  });

  it("includes redemption row with negative stars", () => {
    const csv = generateCsvReport(baseRawData, "en");
    expect(csv).toContain("redemption");
    expect(csv).toContain("Ice Cream");
    expect(csv).toContain("-50");
  });

  it("includes credit transaction row", () => {
    const csv = generateCsvReport(baseRawData, "en");
    expect(csv).toContain("credit");
    expect(csv).toContain("credit_used");
    expect(csv).toContain("-20");
  });

  it("uses Chinese names when locale is zh-CN", () => {
    const csv = generateCsvReport(baseRawData, "zh-CN");
    expect(csv).toContain("阅读30分钟");
    expect(csv).toContain("冰淇淋");
  });

  it("falls back to English name when Chinese name is null", () => {
    const data: ReportRawData = {
      ...baseRawData,
      transactions: [{ ...baseTx, quests: { name_en: "Homework", name_zh: null } }],
    };
    const csv = generateCsvReport(data, "zh-CN");
    expect(csv).toContain("Homework");
  });

  it("handles empty data gracefully", () => {
    const emptyData: ReportRawData = {
      ...baseRawData,
      children: [],
      transactions: null,
      redemptions: null,
      creditTx: null,
    };
    const csv = generateCsvReport(emptyData, "en");
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(1); // header only
  });

  it("escapes commas in names with double quotes", () => {
    const data: ReportRawData = {
      ...baseRawData,
      transactions: [{ ...baseTx, quests: { name_en: "Read, Write, Repeat", name_zh: null } }],
      redemptions: [],
      creditTx: [],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain('"Read, Write, Repeat"');
  });

  it("escapes double quotes in names", () => {
    const data: ReportRawData = {
      ...baseRawData,
      transactions: [{ ...baseTx, quests: { name_en: 'Say "hello"', name_zh: null } }],
      redemptions: [],
      creditTx: [],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain('"Say ""hello"""');
  });

  it("maps child_id to child name", () => {
    const data: ReportRawData = {
      ...baseRawData,
      children: [
        { id: "c1", name: "Emma" },
        { id: "c2", name: "Alex" },
      ],
      transactions: [
        { ...baseTx, child_id: "c1" },
        { ...baseTx, child_id: "c2", created_at: "2026-02-10T11:00:00.000Z" },
      ],
      redemptions: [],
      creditTx: [],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain("Emma");
    expect(csv).toContain("Alex");
  });

  it("sorts rows by date descending", () => {
    const data: ReportRawData = {
      ...baseRawData,
      transactions: [
        { ...baseTx, created_at: "2026-02-08T10:00:00.000Z" },
        { ...baseTx, created_at: "2026-02-12T10:00:00.000Z" },
      ],
      redemptions: [],
      creditTx: [],
    };
    const csv = generateCsvReport(data, "en");
    const lines = csv.trim().split("\n");
    // First data row should be the later date
    expect(lines[1]).toContain("2026-02-12");
    expect(lines[2]).toContain("2026-02-08");
  });

  it("includes credit_repaid as positive stars", () => {
    const data: ReportRawData = {
      ...baseRawData,
      transactions: [],
      redemptions: [],
      creditTx: [{ ...baseCreditTx, transaction_type: "credit_repaid", amount: 15 }],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain("credit_repaid");
    expect(csv).toContain("15");
  });

  it("shows Unknown for unmapped child_id", () => {
    const data: ReportRawData = {
      ...baseRawData,
      children: [],
      transactions: [baseTx],
      redemptions: [],
      creditTx: [],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain("Unknown");
  });

  it("handles redemptions without rewards gracefully", () => {
    const data: ReportRawData = {
      ...baseRawData,
      transactions: [],
      redemptions: [{ ...baseRedemption, rewards: null }],
      creditTx: [],
    };
    const csv = generateCsvReport(data, "en");
    // Should not throw, name column should be empty
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2);
  });
});
