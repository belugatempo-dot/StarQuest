# Dashboard Info Icons & CSV Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add info tooltips to dashboard stat cards and CSV export format option to the Generate Report modal.

**Architecture:** (1) Extract stat cards from the server page into a client component `StatCardGrid` with click-to-show tooltip behavior. (2) Add a format toggle (Markdown/CSV) to `GenerateReportModal`, create a new `POST /api/reports/generate-csv` API route that reuses `fetchReportBaseData` and returns row-level transaction data. (3) Add a CSV formatter utility `lib/reports/csv-formatter.ts`.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, next-intl, Jest + React Testing Library

---

### Task 1: Add i18n keys for tooltip descriptions and CSV export

**Files:**
- Modify: `messages/en.json` (add `stats.*` and `reports.csv*` keys)
- Modify: `messages/zh-CN.json` (same keys in Chinese)

**Step 1: Add English i18n keys**

In `messages/en.json`, add inside the `"reports"` object:

```json
"formatLabel": "Format",
"formatMarkdown": "Markdown",
"formatCsv": "CSV",
"csvDownload": "Download CSV"
```

Add a new top-level `"stats"` object:

```json
"stats": {
  "totalRecords": "Total number of star transactions and redemptions",
  "positive": "Number of records where stars were earned",
  "negative": "Number of records where stars were deducted",
  "totalStarsPlus": "Total stars earned from all positive records",
  "totalStarsMinus": "Total stars lost from deductions (not including redemptions)",
  "starsRedeemed": "Stars spent on redeeming rewards",
  "creditBorrowed": "Stars borrowed through the credit system",
  "netStars": "Stars earned minus deducted minus redeemed (does not include credit)"
}
```

**Step 2: Add Chinese i18n keys**

In `messages/zh-CN.json`, add inside the `"reports"` object:

```json
"formatLabel": "格式",
"formatMarkdown": "Markdown",
"formatCsv": "CSV",
"csvDownload": "下载 CSV"
```

Add a new top-level `"stats"` object:

```json
"stats": {
  "totalRecords": "星星交易和兑换的总记录数",
  "positive": "获得星星的记录数",
  "negative": "扣除星星的记录数",
  "totalStarsPlus": "所有加分记录的星星总和",
  "totalStarsMinus": "所有扣分记录的星星总和（不含兑换）",
  "starsRedeemed": "兑换奖励花费的星星",
  "creditBorrowed": "通过信用系统借用的星星",
  "netStars": "获得 − 扣除 − 兑换（不含信用）"
}
```

**Step 3: Commit**

```bash
git add messages/en.json messages/zh-CN.json
git commit -m "feat: add i18n keys for stat tooltips and CSV export"
```

---

### Task 2: Create StatCard component with tooltip

**Files:**
- Create: `components/ui/StatCard.tsx`
- Test: `__tests__/components/ui/StatCard.test.tsx`

**Step 1: Write the failing tests**

```tsx
// __tests__/components/ui/StatCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import StatCard from "@/components/ui/StatCard";

describe("StatCard", () => {
  const defaultProps = {
    label: "Total Records",
    value: "115",
    tooltip: "Total number of star transactions and redemptions",
  };

  it("renders label and value", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText("Total Records")).toBeInTheDocument();
    expect(screen.getByText("115")).toBeInTheDocument();
  });

  it("renders info icon button", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByRole("button", { name: /info/i })).toBeInTheDocument();
  });

  it("does not show tooltip by default", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.queryByText(defaultProps.tooltip)).not.toBeInTheDocument();
  });

  it("shows tooltip when info icon is clicked", () => {
    render(<StatCard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /info/i }));
    expect(screen.getByText(defaultProps.tooltip)).toBeInTheDocument();
  });

  it("hides tooltip when info icon is clicked again", () => {
    render(<StatCard {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /info/i });
    fireEvent.click(btn);
    expect(screen.getByText(defaultProps.tooltip)).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText(defaultProps.tooltip)).not.toBeInTheDocument();
  });

  it("applies custom value color class", () => {
    render(<StatCard {...defaultProps} valueColor="text-green-400" />);
    const valueEl = screen.getByText("115");
    expect(valueEl.className).toContain("text-green-400");
  });

  it("defaults value color to text-white", () => {
    render(<StatCard {...defaultProps} />);
    const valueEl = screen.getByText("115");
    expect(valueEl.className).toContain("text-white");
  });

  it("renders icon prefix in label when provided", () => {
    render(<StatCard {...defaultProps} icon="🎁" />);
    expect(screen.getByText(/🎁/)).toBeInTheDocument();
  });

  it("applies custom card class when provided", () => {
    const { container } = render(<StatCard {...defaultProps} cardClass="net-stars-card" />);
    expect(container.firstChild).toHaveClass("net-stars-card");
  });

  it("applies default card class stat-night-card", () => {
    const { container } = render(<StatCard {...defaultProps} />);
    expect(container.firstChild).toHaveClass("stat-night-card");
  });

  it("renders label color as text-star-glow when labelColor provided", () => {
    render(<StatCard {...defaultProps} labelColor="text-star-glow" />);
    const label = screen.getByText("Total Records");
    expect(label.className).toContain("text-star-glow");
  });

  it("closes tooltip when clicking outside", () => {
    render(
      <div>
        <StatCard {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: /info/i }));
    expect(screen.getByText(defaultProps.tooltip)).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText(defaultProps.tooltip)).not.toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/components/ui/StatCard.test.tsx
```
Expected: FAIL — module not found

**Step 3: Implement StatCard component**

```tsx
// components/ui/StatCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  tooltip: string;
  valueColor?: string;
  labelColor?: string;
  icon?: string;
  cardClass?: string;
}

export default function StatCard({
  label,
  value,
  tooltip,
  valueColor = "text-white",
  labelColor = "text-slate-300",
  icon,
  cardClass = "stat-night-card",
}: StatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;

    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  return (
    <div ref={cardRef} className={`${cardClass} rounded-lg shadow-lg p-4 relative`}>
      <div className="flex items-center justify-between mb-1 relative z-10">
        <div className={`text-sm ${labelColor}`}>
          {icon && <span>{icon} </span>}
          {label}
        </div>
        <button
          type="button"
          aria-label="info"
          onClick={() => setShowTooltip((prev) => !prev)}
          className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-xs leading-none"
        >
          ⓘ
        </button>
      </div>
      <div className={`text-2xl font-bold relative z-10 ${valueColor}`}>
        {value}
      </div>
      {showTooltip && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-slate-800 border border-white/20 rounded-lg px-3 py-2 text-xs text-slate-300 shadow-lg">
          {tooltip}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/components/ui/StatCard.test.tsx
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add components/ui/StatCard.tsx __tests__/components/ui/StatCard.test.tsx
git commit -m "feat: add StatCard component with info tooltip"
```

---

### Task 3: Extract stat cards grid into StatCardGrid client component

**Files:**
- Create: `components/shared/StatCardGrid.tsx`
- Test: `__tests__/components/shared/StatCardGrid.test.tsx`

**Step 1: Write the failing tests**

```tsx
// __tests__/components/shared/StatCardGrid.test.tsx
import { render, screen } from "@testing-library/react";
import StatCardGrid from "@/components/shared/StatCardGrid";

describe("StatCardGrid", () => {
  const defaultProps = {
    locale: "en",
    totalRecords: 115,
    positiveRecords: 91,
    negativeRecords: 24,
    totalStarsGiven: 1361,
    totalStarsDeducted: -95,
    starsRedeemed: 1683,
    totalCreditBorrowed: 211,
    netStars: -417,
  };

  it("renders all 8 stat cards in English", () => {
    render(<StatCardGrid {...defaultProps} />);
    expect(screen.getByText("Total Records")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByText("Total Stars +")).toBeInTheDocument();
    expect(screen.getByText("Total Stars -")).toBeInTheDocument();
    expect(screen.getByText(/Stars Redeemed/)).toBeInTheDocument();
    expect(screen.getByText(/Credit Borrowed/)).toBeInTheDocument();
    expect(screen.getByText(/Net Stars/)).toBeInTheDocument();
  });

  it("renders all 8 stat cards in Chinese", () => {
    render(<StatCardGrid {...defaultProps} locale="zh-CN" />);
    expect(screen.getByText("总记录")).toBeInTheDocument();
    expect(screen.getByText("加分记录")).toBeInTheDocument();
    expect(screen.getByText("扣分记录")).toBeInTheDocument();
    expect(screen.getByText("总星星+")).toBeInTheDocument();
    expect(screen.getByText("总星星-")).toBeInTheDocument();
    expect(screen.getByText(/星星兑换/)).toBeInTheDocument();
    expect(screen.getByText(/信用借用/)).toBeInTheDocument();
    expect(screen.getByText(/净值/)).toBeInTheDocument();
  });

  it("renders correct values", () => {
    render(<StatCardGrid {...defaultProps} />);
    expect(screen.getByText("115")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("+1361")).toBeInTheDocument();
    expect(screen.getByText("-95")).toBeInTheDocument();
    expect(screen.getByText("1683")).toBeInTheDocument();
    expect(screen.getByText("211")).toBeInTheDocument();
    expect(screen.getByText("-417")).toBeInTheDocument();
  });

  it("shows positive prefix for positive net stars", () => {
    render(<StatCardGrid {...defaultProps} netStars={35} />);
    expect(screen.getByText("+35")).toBeInTheDocument();
  });

  it("renders 8 info icon buttons", () => {
    render(<StatCardGrid {...defaultProps} />);
    const infoBtns = screen.getAllByRole("button", { name: /info/i });
    expect(infoBtns).toHaveLength(8);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/components/shared/StatCardGrid.test.tsx
```
Expected: FAIL — module not found

**Step 3: Implement StatCardGrid component**

```tsx
// components/shared/StatCardGrid.tsx
"use client";

import { useTranslations } from "next-intl";
import StatCard from "@/components/ui/StatCard";

interface StatCardGridProps {
  locale: string;
  totalRecords: number;
  positiveRecords: number;
  negativeRecords: number;
  totalStarsGiven: number;
  totalStarsDeducted: number;
  starsRedeemed: number;
  totalCreditBorrowed: number;
  netStars: number;
}

export default function StatCardGrid({
  locale,
  totalRecords,
  positiveRecords,
  negativeRecords,
  totalStarsGiven,
  totalStarsDeducted,
  starsRedeemed,
  totalCreditBorrowed,
  netStars,
}: StatCardGridProps) {
  const t = useTranslations("stats");
  const isZh = locale === "zh-CN";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label={isZh ? "总记录" : "Total Records"}
        value={totalRecords}
        tooltip={t("totalRecords")}
        labelColor="text-star-glow"
      />
      <StatCard
        label={isZh ? "加分记录" : "Positive"}
        value={positiveRecords}
        tooltip={t("positive")}
        valueColor="text-green-400"
      />
      <StatCard
        label={isZh ? "扣分记录" : "Negative"}
        value={negativeRecords}
        tooltip={t("negative")}
        valueColor="text-red-400"
      />
      <StatCard
        label={isZh ? "总星星+" : "Total Stars +"}
        value={`+${totalStarsGiven}`}
        tooltip={t("totalStarsPlus")}
        valueColor="text-green-400"
      />
      <StatCard
        label={isZh ? "总星星-" : "Total Stars -"}
        value={totalStarsDeducted}
        tooltip={t("totalStarsMinus")}
        valueColor="text-red-400"
      />
      <StatCard
        label={isZh ? "星星兑换" : "Stars Redeemed"}
        value={starsRedeemed}
        tooltip={t("starsRedeemed")}
        icon="🎁"
        labelColor="text-purple-300"
        valueColor="text-purple-300"
      />
      <StatCard
        label={isZh ? "信用借用" : "Credit Borrowed"}
        value={totalCreditBorrowed}
        tooltip={t("creditBorrowed")}
        icon="💳"
        labelColor="text-blue-300"
        valueColor="text-blue-300"
      />
      <StatCard
        label={isZh ? "净值" : "Net Stars"}
        value={netStars >= 0 ? `+${netStars}` : netStars}
        tooltip={t("netStars")}
        icon="⭐"
        cardClass="net-stars-card"
        labelColor="text-star-glow"
        valueColor={netStars >= 0 ? "text-green-400" : "text-red-400"}
      />
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/components/shared/StatCardGrid.test.tsx
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add components/shared/StatCardGrid.tsx __tests__/components/shared/StatCardGrid.test.tsx
git commit -m "feat: add StatCardGrid with info tooltips for all 8 stats"
```

---

### Task 4: Replace inline stat cards in activities page with StatCardGrid

**Files:**
- Modify: `app/[locale]/(main)/activities/page.tsx`
- Modify: `__tests__/app/main/activities-page.test.tsx`

**Step 1: Update the activities page test**

In `__tests__/app/main/activities-page.test.tsx`, add a mock for `StatCardGrid` at the top (after existing mocks):

```tsx
jest.mock("@/components/shared/StatCardGrid", () => {
  return function MockStatCardGrid(props: any) {
    return (
      <div data-testid="stat-card-grid">
        StatCardGrid totalRecords={props.totalRecords} netStars={props.netStars} creditBorrowed={props.totalCreditBorrowed}
      </div>
    );
  };
});
```

Update the test cases:
- "renders statistics cards" → check for `stat-card-grid` testid with props
- "renders stars redeemed card" and "renders credit borrowed card" → merged into stat-card-grid prop checks
- "zh-CN stat labels" → remove (StatCardGrid handles locale internally)
- Keep credit calculation and net stars tests but assert via StatCardGrid mock props

**Step 2: Run tests to verify current tests still reflect expectations**

```bash
npm test -- __tests__/app/main/activities-page.test.tsx
```

Some tests will fail because we haven't updated the page yet.

**Step 3: Update activities page to use StatCardGrid**

In `app/[locale]/(main)/activities/page.tsx`:
- Add import: `import StatCardGrid from "@/components/shared/StatCardGrid";`
- Replace the entire `{/* Statistics Cards */}` `<div className="grid grid-cols-2 md:grid-cols-4 gap-4">...</div>` block with:

```tsx
<StatCardGrid
  locale={locale}
  totalRecords={totalRecords}
  positiveRecords={positiveRecords}
  negativeRecords={negativeRecords}
  totalStarsGiven={totalStarsGiven}
  totalStarsDeducted={totalStarsDeducted}
  starsRedeemed={starsRedeemed}
  totalCreditBorrowed={totalCreditBorrowed}
  netStars={netStars}
/>
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/app/main/activities-page.test.tsx
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add app/[locale]/(main)/activities/page.tsx __tests__/app/main/activities-page.test.tsx
git commit -m "refactor: extract stat cards to StatCardGrid client component"
```

---

### Task 5: Create CSV formatter utility

**Files:**
- Create: `lib/reports/csv-formatter.ts`
- Test: `__tests__/lib/reports/csv-formatter.test.ts`

**Step 1: Write the failing tests**

```ts
// __tests__/lib/reports/csv-formatter.test.ts
import { generateCsvReport } from "@/lib/reports/csv-formatter";

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

  const baseRawData = {
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
    const data = {
      ...baseRawData,
      transactions: [{ ...baseTx, quests: { name_en: "Homework", name_zh: null } }],
    };
    const csv = generateCsvReport(data, "zh-CN");
    expect(csv).toContain("Homework");
  });

  it("handles empty data gracefully", () => {
    const emptyData = {
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
    const data = {
      ...baseRawData,
      transactions: [{ ...baseTx, quests: { name_en: "Read, Write, Repeat", name_zh: null } }],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain('"Read, Write, Repeat"');
  });

  it("escapes double quotes in names", () => {
    const data = {
      ...baseRawData,
      transactions: [{ ...baseTx, quests: { name_en: 'Say "hello"', name_zh: null } }],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain('"Say ""hello"""');
  });

  it("maps child_id to child name", () => {
    const data = {
      ...baseRawData,
      children: [
        { id: "c1", name: "Emma" },
        { id: "c2", name: "Alex" },
      ],
      transactions: [
        { ...baseTx, child_id: "c1" },
        { ...baseTx, child_id: "c2", created_at: "2026-02-10T11:00:00.000Z" },
      ],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain("Emma");
    expect(csv).toContain("Alex");
  });

  it("sorts rows by date descending", () => {
    const data = {
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
    const data = {
      ...baseRawData,
      transactions: [],
      redemptions: [],
      creditTx: [{ ...baseCreditTx, transaction_type: "credit_repaid", amount: 15 }],
    };
    const csv = generateCsvReport(data, "en");
    expect(csv).toContain("credit_repaid");
    expect(csv).toContain("15");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/reports/csv-formatter.test.ts
```
Expected: FAIL — module not found

**Step 3: Implement CSV formatter**

```ts
// lib/reports/csv-formatter.ts
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
  sortKey: string; // ISO string for sorting
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
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/reports/csv-formatter.test.ts
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/reports/csv-formatter.ts __tests__/lib/reports/csv-formatter.test.ts
git commit -m "feat: add CSV formatter for star activity data export"
```

---

### Task 6: Create CSV API route

**Files:**
- Create: `app/api/reports/generate-csv/route.ts`
- Test: `__tests__/api/reports/generate-csv.test.ts`

**Step 1: Write the failing tests**

Model the tests closely after `__tests__/api/reports/generate-markdown.test.ts` with the same mock pattern. Key test cases:

- Returns 401 when not authenticated
- Returns 403 when not parent
- Returns 400 for missing/invalid periodType, dates
- Returns 500 when fetchReportBaseData returns null
- Calls fetchReportBaseData with correct args
- Calls generateCsvReport with raw data and locale
- Returns CSV content with correct Content-Type (`text/csv; charset=utf-8`) and Content-Disposition
- Returns `.csv` filename extension
- Passes zh-CN locale through

```ts
// __tests__/api/reports/generate-csv.test.ts
// (Same mock setup as generate-markdown.test.ts, but mock csv-formatter instead of markdown-formatter)

jest.mock("next/server", () => {
  class MockHeaders {
    private _headers: Map<string, string>;
    constructor(init?: Record<string, string>) {
      this._headers = new Map(Object.entries(init || {}));
    }
    get(name: string) { return this._headers.get(name) || null; }
  }
  class MockNextRequest {
    private _headers: MockHeaders;
    url: string;
    nextUrl: { searchParams: URLSearchParams };
    _body: any;
    constructor(url: string, init?: { headers?: Record<string, string>; method?: string; body?: string }) {
      this.url = url;
      this._headers = new MockHeaders(init?.headers);
      this.nextUrl = { searchParams: new URLSearchParams(new URL(url).search) };
      this._body = init?.body ? JSON.parse(init.body) : null;
    }
    get headers() { return this._headers; }
    async json() { return this._body; }
  }
  class MockNextResponse {
    status: number;
    body: any;
    _headers: Map<string, string>;
    constructor(body: any, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this._headers = new Map(Object.entries(init?.headers || {}));
    }
    static json(body: any, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
  createAdminClient: jest.fn(),
}));

const mockFetchReportBaseData = jest.fn();

jest.mock("@/lib/reports/report-utils", () => ({
  fetchReportBaseData: (...args: any[]) => mockFetchReportBaseData(...args),
  buildChildrenStats: jest.fn(),
}));

const mockGenerateCsvReport = jest.fn();

jest.mock("@/lib/reports/csv-formatter", () => ({
  generateCsvReport: (...args: any[]) => mockGenerateCsvReport(...args),
}));

import { POST } from "@/app/api/reports/generate-csv/route";
const { NextRequest } = require("next/server");

function makeUserChain(userData: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(userData);
  return chain;
}

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/reports/generate-csv", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validBody = {
  periodType: "weekly",
  periodStart: "2026-02-09T00:00:00.000Z",
  periodEnd: "2026-02-15T23:59:59.999Z",
  locale: "en",
};

describe("POST /api/reports/generate-csv", () => {
  let userChain: any;

  beforeEach(() => {
    jest.clearAllMocks();
    userChain = makeUserChain({
      data: { id: "parent-1", role: "parent", family_id: "family-1" },
      error: null,
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: "parent-1" } } });
    mockFrom.mockReturnValue(userChain);
    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });
    mockFetchReportBaseData.mockResolvedValue({
      family: { id: "family-1", name: "Demo Family" },
      children: [{ id: "c1", name: "Emma" }],
      transactions: [],
      redemptions: [],
      balances: [],
      creditTx: [],
      pendingStars: [],
      pendingRedemptions: [],
    });
    mockGenerateCsvReport.mockReturnValue("Date,Time,Child,Type,Name,Stars,Status\n2026-02-10,10:30,Emma,star,Read,5,approved");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not parent", async () => {
    userChain.maybeSingle.mockResolvedValue({
      data: { id: "child-1", role: "child", family_id: "family-1" },
      error: null,
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid periodType", async () => {
    const res = await POST(makeRequest({ ...validBody, periodType: "biweekly" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing dates", async () => {
    const res = await POST(makeRequest({ ...validBody, periodStart: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when fetchReportBaseData returns null", async () => {
    mockFetchReportBaseData.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });

  it("calls generateCsvReport with raw data and locale", async () => {
    await POST(makeRequest(validBody));
    expect(mockGenerateCsvReport).toHaveBeenCalledWith(
      expect.objectContaining({ family: { id: "family-1", name: "Demo Family" } }),
      "en"
    );
  });

  it("returns CSV with correct headers", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(res._headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res._headers.get("Content-Disposition")).toContain(".csv");
  });

  it("passes zh-CN locale through", async () => {
    await POST(makeRequest({ ...validBody, locale: "zh-CN" }));
    expect(mockGenerateCsvReport).toHaveBeenCalledWith(expect.anything(), "zh-CN");
  });

  it("returns CSV content in response body", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.body).toContain("Date,Time,Child");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/api/reports/generate-csv.test.ts
```
Expected: FAIL — module not found

**Step 3: Implement CSV API route**

```ts
// app/api/reports/generate-csv/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchReportBaseData } from "@/lib/reports/report-utils";
import { generateCsvReport } from "@/lib/reports/csv-formatter";
import { getReportFilename, type PeriodType } from "@/lib/reports/date-ranges";
import type { ReportLocale } from "@/types/reports";

const VALID_PERIOD_TYPES = ["daily", "weekly", "monthly", "quarterly", "yearly"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = (await supabase
    .from("users")
    .select("id, role, family_id")
    .eq("id", user.id)
    .maybeSingle()) as { data: { id: string; role: string; family_id: string | null } | null; error: any };

  if (!profile || profile.role !== "parent" || !profile.family_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { periodType, periodStart, periodEnd, locale: bodyLocale } = body;

  if (!periodType || !VALID_PERIOD_TYPES.includes(periodType)) {
    return NextResponse.json({ error: "Invalid periodType" }, { status: 400 });
  }

  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: "Missing periodStart or periodEnd" }, { status: 400 });
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const locale: ReportLocale = bodyLocale === "zh-CN" ? "zh-CN" : "en";
  const familyId = profile.family_id;

  const rawData = await fetchReportBaseData(familyId, start, end);
  if (!rawData) {
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }

  const csv = generateCsvReport(rawData, locale);

  // Reuse filename helper but replace .md with .csv
  const mdFilename = getReportFilename(periodType as PeriodType, start, end);
  const filename = mdFilename.replace(/\.md$/, ".csv");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/api/reports/generate-csv.test.ts
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add app/api/reports/generate-csv/route.ts __tests__/api/reports/generate-csv.test.ts
git commit -m "feat: add POST /api/reports/generate-csv endpoint"
```

---

### Task 7: Add format toggle to GenerateReportModal

**Files:**
- Modify: `components/admin/GenerateReportModal.tsx`
- Modify: `__tests__/components/admin/GenerateReportModal.test.tsx`

**Step 1: Update tests**

Add these tests to the existing describe block in `__tests__/components/admin/GenerateReportModal.test.tsx`:

```tsx
it("renders format toggle with Markdown and CSV options", () => {
  render(<GenerateReportModal {...defaultProps} />);
  expect(screen.getByRole("button", { name: "reports.formatMarkdown" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "reports.formatCsv" })).toBeInTheDocument();
});

it("defaults to Markdown format", () => {
  render(<GenerateReportModal {...defaultProps} />);
  const mdBtn = screen.getByRole("button", { name: "reports.formatMarkdown" });
  expect(mdBtn.className).toContain("bg-indigo");
});

it("switches to CSV format when CSV button clicked", () => {
  render(<GenerateReportModal {...defaultProps} />);
  const csvBtn = screen.getByRole("button", { name: "reports.formatCsv" });
  fireEvent.click(csvBtn);
  expect(csvBtn.className).toContain("bg-indigo");
});

it("calls CSV endpoint when CSV format selected", async () => {
  render(<GenerateReportModal {...defaultProps} />);
  fireEvent.click(screen.getByRole("button", { name: "reports.formatCsv" }));
  fireEvent.click(screen.getByRole("button", { name: "reports.download" }));

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/reports/generate-csv",
      expect.objectContaining({ method: "POST" })
    );
  });
});

it("calls Markdown endpoint when Markdown format selected", async () => {
  render(<GenerateReportModal {...defaultProps} />);
  // Default is markdown, just click download
  fireEvent.click(screen.getByRole("button", { name: "reports.download" }));

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/reports/generate-markdown",
      expect.objectContaining({ method: "POST" })
    );
  });
});

it("shows .csv in filename preview when CSV selected", () => {
  const { getReportFilename } = require("@/lib/reports/date-ranges");
  getReportFilename.mockReturnValue("starquest-weekly-2026-02-09-to-2026-02-15.md");

  render(<GenerateReportModal {...defaultProps} />);
  fireEvent.click(screen.getByRole("button", { name: "reports.formatCsv" }));

  expect(screen.getByText(/\.csv/)).toBeInTheDocument();
});
```

**Step 2: Run tests to verify new tests fail**

```bash
npm test -- __tests__/components/admin/GenerateReportModal.test.tsx
```
Expected: New tests FAIL (format buttons not found)

**Step 3: Update GenerateReportModal component**

Add `format` state (`"markdown" | "csv"`), add format toggle buttons above the period type selector, and use the format to determine the API endpoint and filename extension.

Key changes in `GenerateReportModal.tsx`:

1. Add state: `const [format, setFormat] = useState<"markdown" | "csv">("markdown");`
2. Add format toggle UI (two buttons, same style as period type buttons)
3. In `handleDownload()`:
   - Use endpoint: `format === "csv" ? "/api/reports/generate-csv" : "/api/reports/generate-markdown"`
   - For filename display: if CSV, replace `.md` with `.csv`

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/components/admin/GenerateReportModal.test.tsx
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add components/admin/GenerateReportModal.tsx __tests__/components/admin/GenerateReportModal.test.tsx
git commit -m "feat: add Markdown/CSV format toggle to GenerateReportModal"
```

---

### Task 8: Update date-ranges to support CSV filenames

**Files:**
- Modify: `lib/reports/date-ranges.ts` — add `getReportFilenameCsv()` or ensure filename helper works for CSV
- No change needed if we just do `.replace(/\.md$/, ".csv")` in the API route and modal (already done above)

**This task is a no-op** — the `.md → .csv` replacement is already handled in both the API route (Task 6) and the modal (Task 7). Skip this task.

---

### Task 9: Run full test suite and verify nothing is broken

**Step 1: Run all tests**

```bash
npm test
```
Expected: ALL PASS (3050+ tests)

**Step 2: Run build**

```bash
npm run build
```
Expected: No errors

**Step 3: Final commit with updated CLAUDE.md if needed**

Update CLAUDE.md to mention:
- `StatCard` and `StatCardGrid` components
- CSV export endpoint
- New i18n keys

```bash
git add -A
git commit -m "docs: update CLAUDE.md with stat card tooltips and CSV export"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | i18n keys | — | `messages/en.json`, `messages/zh-CN.json` |
| 2 | StatCard component | `components/ui/StatCard.tsx`, test | — |
| 3 | StatCardGrid component | `components/shared/StatCardGrid.tsx`, test | — |
| 4 | Replace inline cards | — | `activities/page.tsx`, test |
| 5 | CSV formatter | `lib/reports/csv-formatter.ts`, test | — |
| 6 | CSV API route | `app/api/reports/generate-csv/route.ts`, test | — |
| 7 | Format toggle in modal | — | `GenerateReportModal.tsx`, test |
| 8 | (no-op) | — | — |
| 9 | Full test suite | — | CLAUDE.md |
