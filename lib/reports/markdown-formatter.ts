/**
 * Generates a Markdown string from report data.
 * Uses inline i18n (small label set) to avoid next-intl server complexity.
 */

import type { ChildWeeklyData } from "@/types/reports";
import type { PeriodType } from "./date-ranges";

export interface MarkdownReportData {
  familyName: string;
  locale: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  children: ChildWeeklyData[];
  totalEarned: number;
  totalSpent: number;
  previousPeriod?: {
    totalEarned: number;
    totalSpent: number;
  };
}

const labels = {
  en: {
    title: "StarQuest Family Report",
    period: "Period",
    generated: "Generated",
    familyOverview: "Family Overview",
    metric: "Metric",
    value: "Value",
    totalEarned: "Total Stars Earned",
    totalSpent: "Total Stars Spent",
    net: "Net",
    vsPrevious: "vs. Previous Period",
    currentBalance: "Current Balance",
    starsEarned: "Stars Earned",
    starsSpent: "Stars Spent",
    netStars: "Net Stars",
    creditBorrowed: "Credit Borrowed",
    creditRepaid: "Credit Repaid",
    topQuests: "Top Quests",
    quest: "Quest",
    times: "Times",
    stars: "Stars",
    pendingWarning: "pending requests need review",
    earned: "earned",
    spent: "spent",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    noChange: "N/A (no prior data)",
  },
  "zh-CN": {
    title: "StarQuest 家庭报告",
    period: "期间",
    generated: "生成时间",
    familyOverview: "家庭概览",
    metric: "指标",
    value: "数值",
    totalEarned: "总获得星星",
    totalSpent: "总消费星星",
    net: "净值",
    vsPrevious: "与上期对比",
    currentBalance: "当前余额",
    starsEarned: "获得星星",
    starsSpent: "消费星星",
    netStars: "净星星",
    creditBorrowed: "信用借出",
    creditRepaid: "信用偿还",
    topQuests: "热门任务",
    quest: "任务",
    times: "次数",
    stars: "星星",
    pendingWarning: "个待审请求需要处理",
    earned: "获得",
    spent: "消费",
    daily: "每日",
    weekly: "每周",
    monthly: "每月",
    quarterly: "每季度",
    yearly: "每年",
    noChange: "无数据",
  },
} as const;

type LabelSet = Record<keyof (typeof labels)["en"], string>;

function getLabels(locale: string): LabelSet {
  return locale === "zh-CN" ? labels["zh-CN"] : labels.en;
}

function formatDateUTC(d: Date): string {
  return d.toISOString().split("T")[0];
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+∞" : current === 0 ? "0.0%" : "-∞";
  }
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function pctArrow(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "→";
  return current >= previous ? "↑" : "↓";
}

export function generateMarkdownReport(data: MarkdownReportData): string {
  const l = getLabels(data.locale);
  const periodLabel = l[data.periodType];
  const lines: string[] = [];

  // Title
  lines.push(`# ${l.title} — ${data.familyName}`);
  lines.push(
    `**${l.period}:** ${periodLabel} | ${formatDateUTC(data.periodStart)} – ${formatDateUTC(data.periodEnd)}`
  );
  lines.push(`**${l.generated}:** ${data.generatedAt.toISOString()}`);
  lines.push("");

  // Family Overview
  lines.push(`## ${l.familyOverview}`);
  const netTotal = data.totalEarned - data.totalSpent;
  lines.push(`| ${l.metric} | ${l.value} |`);
  lines.push("|--------|-------|");
  lines.push(`| ${l.totalEarned} | +${data.totalEarned} |`);
  lines.push(`| ${l.totalSpent} | -${data.totalSpent} |`);
  lines.push(`| ${l.net} | ${netTotal >= 0 ? "+" : ""}${netTotal} |`);

  if (data.previousPeriod) {
    const earnedPct = pctChange(data.totalEarned, data.previousPeriod.totalEarned);
    const spentPct = pctChange(data.totalSpent, data.previousPeriod.totalSpent);
    const earnedArrow = pctArrow(data.totalEarned, data.previousPeriod.totalEarned);
    const spentArrow = pctArrow(data.totalSpent, data.previousPeriod.totalSpent);
    lines.push(
      `| ${l.vsPrevious} | ${earnedArrow} ${earnedPct} ${l.earned}, ${spentArrow} ${spentPct} ${l.spent} |`
    );
  }
  lines.push("");

  // Per-child sections
  for (const child of data.children) {
    lines.push(`## ${child.name}`);
    lines.push(`**${l.currentBalance}:** ${child.currentBalance} ⭐`);
    lines.push("");
    lines.push(`| ${l.metric} | ${l.value} |`);
    lines.push("|--------|-------|");
    lines.push(`| ${l.starsEarned} | +${child.starsEarned} |`);
    lines.push(`| ${l.starsSpent} | -${child.starsSpent} |`);
    lines.push(`| ${l.netStars} | ${child.netStars >= 0 ? "+" : ""}${child.netStars} |`);

    if (child.creditBorrowed > 0 || child.creditRepaid > 0) {
      lines.push(`| ${l.creditBorrowed} | ${child.creditBorrowed} |`);
      lines.push(`| ${l.creditRepaid} | ${child.creditRepaid} |`);
    }
    lines.push("");

    // Top Quests
    if (child.topQuests.length > 0) {
      lines.push(`### ${l.topQuests}`);
      lines.push(`| ${l.quest} | ${l.times} | ${l.stars} |`);
      lines.push("|-------|-------|-------|");
      for (const q of child.topQuests) {
        lines.push(`| ${q.name} | ${q.count} | ${q.stars} |`);
      }
      lines.push("");
    }

    // Pending warning
    if (child.pendingRequestsCount > 0) {
      lines.push(
        `⚠️ ${child.pendingRequestsCount} ${l.pendingWarning}`
      );
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
