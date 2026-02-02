import type { MonthlyReportData, ReportLocale } from "@/types/reports";
import { baseLayout, colors, type BilingualText } from "./base-layout";

/**
 * Monthly report specific translations
 */
const translations: Record<string, BilingualText> = {
  subject: {
    en: "StarQuest Monthly Report",
    "zh-CN": "夺星大闯关 月报",
  },
  monthSummary: {
    en: "Monthly Star Summary",
    "zh-CN": "每月星星汇总",
  },
  familyOverview: {
    en: "Family Overview",
    "zh-CN": "家庭总览",
  },
  totalEarned: {
    en: "Total Earned",
    "zh-CN": "总获得",
  },
  totalSpent: {
    en: "Total Spent",
    "zh-CN": "总消费",
  },
  childDetails: {
    en: "Child Details",
    "zh-CN": "孩子详情",
  },
  starsEarned: {
    en: "Stars Earned",
    "zh-CN": "获得星星",
  },
  starsSpent: {
    en: "Stars Spent",
    "zh-CN": "消费星星",
  },
  netChange: {
    en: "Net Change",
    "zh-CN": "净变化",
  },
  currentBalance: {
    en: "Current Balance",
    "zh-CN": "当前余额",
  },
  topQuests: {
    en: "Top Completed Quests",
    "zh-CN": "热门完成任务",
  },
  creditActivity: {
    en: "Credit Activity",
    "zh-CN": "信用活动",
  },
  borrowed: {
    en: "Borrowed",
    "zh-CN": "借用",
  },
  repaid: {
    en: "Repaid",
    "zh-CN": "偿还",
  },
  pendingRequests: {
    en: "Pending Requests",
    "zh-CN": "待审批请求",
  },
  noActivity: {
    en: "No activity this month",
    "zh-CN": "本月无活动",
  },
  stars: {
    en: "stars",
    "zh-CN": "颗星星",
  },
  times: {
    en: "times",
    "zh-CN": "次",
  },
  periodLabel: {
    en: "Month of",
    "zh-CN": "月份",
  },
  settlementSection: {
    en: "Credit Settlement",
    "zh-CN": "信用结算",
  },
  interestCharged: {
    en: "Interest Charged",
    "zh-CN": "利息费用",
  },
  debtAmount: {
    en: "Debt Amount",
    "zh-CN": "债务金额",
  },
  creditLimitChange: {
    en: "Credit Limit Change",
    "zh-CN": "信用额度变化",
  },
  interestBreakdown: {
    en: "Interest Breakdown",
    "zh-CN": "利息明细",
  },
  tier: {
    en: "Tier",
    "zh-CN": "档位",
  },
  debtRange: {
    en: "Debt Range",
    "zh-CN": "债务范围",
  },
  rate: {
    en: "Rate",
    "zh-CN": "利率",
  },
  debtInTier: {
    en: "Debt in Tier",
    "zh-CN": "档位内债务",
  },
  interestAmount: {
    en: "Interest",
    "zh-CN": "利息",
  },
  noSettlement: {
    en: "No credit settlement this month",
    "zh-CN": "本月无信用结算",
  },
  comparedToLastMonth: {
    en: "Compared to Last Month",
    "zh-CN": "与上月相比",
  },
  unlimited: {
    en: "Unlimited",
    "zh-CN": "无限制",
  },
};

/**
 * Get localized text
 */
function t(key: string, locale: ReportLocale): string {
  return translations[key]?.[locale] || translations[key]?.en || key;
}

/**
 * Format date for display
 */
function formatDate(date: Date, locale: ReportLocale): string {
  return date.toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Generate subject line for monthly report
 */
export function getMonthlyReportSubject(
  data: MonthlyReportData,
  locale: ReportLocale
): string {
  return `${t("subject", locale)} - ${data.familyName}`;
}

/**
 * Generate monthly report HTML content
 */
export function generateMonthlyReportHtml(data: MonthlyReportData): string {
  const { locale } = data;
  const monthStr = formatDate(data.periodStart, locale);

  let content = `
    <h2 style="color: ${colors.secondary}; margin-top: 0;">${t("monthSummary", locale)}</h2>
    <p style="color: ${colors.textLight};">${t("periodLabel", locale)}: ${monthStr}</p>

    <!-- Family Overview Stats -->
    <div class="card">
      <h3 class="card-title">${t("familyOverview", locale)} - ${data.familyName}</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
        <tr>
          <td style="text-align: center; padding: 16px; background-color: ${colors.white}; border-radius: 8px; width: 50%;">
            <div style="font-size: 32px; font-weight: bold; color: ${colors.success};">+${data.totalStarsEarned}</div>
            <div style="font-size: 12px; color: ${colors.textLight}; text-transform: uppercase; margin-top: 4px;">${t("totalEarned", locale)}</div>
          </td>
          <td style="width: 16px;"></td>
          <td style="text-align: center; padding: 16px; background-color: ${colors.white}; border-radius: 8px; width: 50%;">
            <div style="font-size: 32px; font-weight: bold; color: ${colors.warning};">-${data.totalStarsSpent}</div>
            <div style="font-size: 12px; color: ${colors.textLight}; text-transform: uppercase; margin-top: 4px;">${t("totalSpent", locale)}</div>
          </td>
        </tr>
      </table>
  `;

  // Month-over-month comparison
  if (data.previousMonthComparison) {
    const { starsEarnedChange, starsSpentChange } = data.previousMonthComparison;
    const earnedIcon = starsEarnedChange >= 0 ? "+" : "";
    const spentIcon = starsSpentChange >= 0 ? "+" : "";
    const earnedColor = starsEarnedChange >= 0 ? colors.success : colors.error;
    const spentColor = starsSpentChange <= 0 ? colors.success : colors.error;

    content += `
      <div style="background-color: ${colors.white}; padding: 12px; border-radius: 6px; margin-top: 12px;">
        <strong style="font-size: 12px; color: ${colors.textLight};">${t("comparedToLastMonth", locale)}</strong>
        <div style="margin-top: 8px;">
          <span style="color: ${earnedColor};">${t("starsEarned", locale)}: ${earnedIcon}${starsEarnedChange}%</span>
          &nbsp;|&nbsp;
          <span style="color: ${spentColor};">${t("starsSpent", locale)}: ${spentIcon}${starsSpentChange}%</span>
        </div>
      </div>
    `;
  }

  content += `</div>`;

  // Child details
  if (data.children.length === 0) {
    content += `
      <div class="card">
        <p style="text-align: center; color: ${colors.textLight};">${t("noActivity", locale)}</p>
      </div>
    `;
  } else {
    for (const child of data.children) {
      const netClass = child.netStars >= 0 ? "text-success" : "text-error";
      const netPrefix = child.netStars >= 0 ? "+" : "";

      content += `
        <div class="card">
          <h3 class="card-title">${child.name}</h3>

          <!-- Stats Row -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
            <tr>
              <td style="text-align: center; padding: 12px;">
                <div style="font-size: 24px; font-weight: bold; color: ${colors.success};">+${child.starsEarned}</div>
                <div style="font-size: 11px; color: ${colors.textLight};">${t("starsEarned", locale)}</div>
              </td>
              <td style="text-align: center; padding: 12px;">
                <div style="font-size: 24px; font-weight: bold; color: ${colors.warning};">-${child.starsSpent}</div>
                <div style="font-size: 11px; color: ${colors.textLight};">${t("starsSpent", locale)}</div>
              </td>
              <td style="text-align: center; padding: 12px;">
                <div style="font-size: 24px; font-weight: bold;" class="${netClass}">${netPrefix}${child.netStars}</div>
                <div style="font-size: 11px; color: ${colors.textLight};">${t("netChange", locale)}</div>
              </td>
              <td style="text-align: center; padding: 12px;">
                <div style="font-size: 24px; font-weight: bold; color: ${colors.primary};">${child.currentBalance}</div>
                <div style="font-size: 11px; color: ${colors.textLight};">${t("currentBalance", locale)}</div>
              </td>
            </tr>
          </table>
      `;

      // Credit activity
      if (child.creditBorrowed > 0 || child.creditRepaid > 0) {
        content += `
          <div style="background-color: ${colors.white}; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
            <strong style="font-size: 12px; color: ${colors.textLight};">${t("creditActivity", locale)}</strong>
            <div style="margin-top: 8px;">
              ${child.creditBorrowed > 0 ? `<span style="color: ${colors.warning};">${t("borrowed", locale)}: ${child.creditBorrowed} ${t("stars", locale)}</span>` : ""}
              ${child.creditBorrowed > 0 && child.creditRepaid > 0 ? " | " : ""}
              ${child.creditRepaid > 0 ? `<span style="color: ${colors.success};">${t("repaid", locale)}: ${child.creditRepaid} ${t("stars", locale)}</span>` : ""}
            </div>
          </div>
        `;
      }

      // Top quests
      if (child.topQuests.length > 0) {
        content += `
          <div style="background-color: ${colors.white}; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
            <strong style="font-size: 12px; color: ${colors.textLight};">${t("topQuests", locale)}</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
        `;
        for (const quest of child.topQuests) {
          content += `<li style="margin: 4px 0;">${quest.name} - ${quest.count} ${t("times", locale)} (+${quest.stars * quest.count} ${t("stars", locale)})</li>`;
        }
        content += `
            </ul>
          </div>
        `;
      }

      // Pending requests
      if (child.pendingRequestsCount > 0) {
        content += `
          <div style="background-color: #FEF3C7; padding: 12px; border-radius: 6px; border-left: 4px solid ${colors.warning};">
            <strong>${t("pendingRequests", locale)}:</strong> ${child.pendingRequestsCount}
          </div>
        `;
      }

      content += `</div>`;
    }
  }

  // Settlement section
  if (data.settlementData && data.settlementData.length > 0) {
    content += `
      <h2 style="color: ${colors.secondary}; margin-top: 32px;">${t("settlementSection", locale)}</h2>
    `;

    for (const settlement of data.settlementData) {
      if (settlement.interestCharged === 0 && settlement.creditLimitChange === 0) {
        continue;
      }

      content += `
        <div class="card">
          <h3 class="card-title">${settlement.name}</h3>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
            <tr>
              <td style="text-align: center; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold; color: ${colors.error};">${settlement.debtAmount}</div>
                <div style="font-size: 11px; color: ${colors.textLight};">${t("debtAmount", locale)}</div>
              </td>
              <td style="text-align: center; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold; color: ${colors.warning};">-${settlement.interestCharged}</div>
                <div style="font-size: 11px; color: ${colors.textLight};">${t("interestCharged", locale)}</div>
              </td>
              <td style="text-align: center; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold; color: ${settlement.creditLimitChange >= 0 ? colors.success : colors.error};">${settlement.creditLimitChange >= 0 ? "+" : ""}${settlement.creditLimitChange}</div>
                <div style="font-size: 11px; color: ${colors.textLight};">${t("creditLimitChange", locale)}</div>
              </td>
            </tr>
          </table>
      `;

      // Interest breakdown
      if (settlement.interestBreakdown.length > 0) {
        content += `
          <div style="background-color: ${colors.white}; padding: 12px; border-radius: 6px;">
            <strong style="font-size: 12px; color: ${colors.textLight};">${t("interestBreakdown", locale)}</strong>
            <table class="data-table" style="margin-top: 8px;">
              <thead>
                <tr>
                  <th>${t("tier", locale)}</th>
                  <th>${t("debtRange", locale)}</th>
                  <th>${t("rate", locale)}</th>
                  <th>${t("debtInTier", locale)}</th>
                  <th>${t("interestAmount", locale)}</th>
                </tr>
              </thead>
              <tbody>
        `;
        for (const tier of settlement.interestBreakdown) {
          const maxDebtDisplay = tier.maxDebt === null ? t("unlimited", locale) : tier.maxDebt;
          content += `
            <tr>
              <td>${tier.tierOrder}</td>
              <td>${tier.minDebt} - ${maxDebtDisplay}</td>
              <td>${(tier.rate * 100).toFixed(1)}%</td>
              <td>${tier.debtInTier}</td>
              <td style="color: ${colors.error};">-${tier.interestAmount}</td>
            </tr>
          `;
        }
        content += `
              </tbody>
            </table>
          </div>
        `;
      }

      content += `</div>`;
    }
  }

  return baseLayout(content, locale);
}
