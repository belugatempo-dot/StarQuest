import type { ReportRawData } from "@/lib/reports/report-utils";
import type { ReportLocale } from "@/types/reports";

interface CsvRow {
  date: string;
  time: string;
  child: string;
  type: string;
  name: string;
  stars: number;
  status: string;
  sortKey: string;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateCsvReport(rawData: ReportRawData, locale: ReportLocale): string {
  const childMap = new Map(rawData.children.map((c) => [c.id, c.name]));
  const isZh = locale === "zh-CN";
  const rows: CsvRow[] = [];

  // Star transactions
  for (const tx of rawData.transactions || []) {
    const d = new Date(tx.created_at);
    const quest = tx.quests as { name_en: string; name_zh: string | null } | null;
    const name = isZh && quest?.name_zh ? quest.name_zh : (quest?.name_en || "");
    rows.push({
      date: d.toISOString().slice(0, 10),
      time: d.toISOString().slice(11, 16),
      child: childMap.get(tx.child_id) || "Unknown",
      type: "star",
      name,
      stars: tx.stars,
      status: tx.status,
      sortKey: tx.created_at,
    });
  }

  // Redemptions
  for (const r of rawData.redemptions || []) {
    const d = new Date(r.created_at);
    const reward = r.rewards as { name_en: string; name_zh: string | null } | null;
    const name = isZh && reward?.name_zh ? reward.name_zh : (reward?.name_en || "");
    rows.push({
      date: d.toISOString().slice(0, 10),
      time: d.toISOString().slice(11, 16),
      child: childMap.get(r.child_id) || "Unknown",
      type: "redemption",
      name,
      stars: -r.stars_spent,
      status: r.status,
      sortKey: r.created_at,
    });
  }

  // Credit transactions
  for (const ct of rawData.creditTx || []) {
    const d = new Date(ct.created_at);
    rows.push({
      date: d.toISOString().slice(0, 10),
      time: d.toISOString().slice(11, 16),
      child: childMap.get(ct.child_id) || "Unknown",
      type: "credit",
      name: ct.transaction_type,
      stars: ct.transaction_type === "credit_used" ? -ct.amount : ct.amount,
      status: ct.transaction_type,
      sortKey: ct.created_at,
    });
  }

  // Sort by date descending
  rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  const header = "Date,Time,Child,Type,Name,Stars,Status";
  const dataLines = rows.map(
    (r) =>
      `${r.date},${r.time},${escapeCsv(r.child)},${r.type},${escapeCsv(r.name)},${r.stars},${r.status}`
  );

  return [header, ...dataLines].join("\n");
}
