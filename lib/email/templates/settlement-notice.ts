import type { SettlementNotificationData, ReportLocale } from "@/types/reports";
import { baseLayout, colors, type BilingualText } from "./base-layout";

/**
 * Settlement notice specific translations
 */
const translations: Record<string, BilingualText> = {
  subject: {
    en: "StarQuest Credit Settlement Notice",
    "zh-CN": "夺星大闯关 信用结算通知",
  },
  title: {
    en: "Credit Settlement Completed",
    "zh-CN": "信用结算已完成",
  },
  settlementDate: {
    en: "Settlement Date",
    "zh-CN": "结算日期",
  },
  summary: {
    en: "Settlement Summary",
    "zh-CN": "结算摘要",
  },
  childName: {
    en: "Child",
    "zh-CN": "孩子",
  },
  debtAmount: {
    en: "Debt Amount",
    "zh-CN": "债务金额",
  },
  interestCharged: {
    en: "Interest Charged",
    "zh-CN": "利息费用",
  },
  creditLimitBefore: {
    en: "Credit Limit (Before)",
    "zh-CN": "信用额度（之前）",
  },
  creditLimitAfter: {
    en: "Credit Limit (After)",
    "zh-CN": "信用额度（之后）",
  },
  creditLimitChange: {
    en: "Limit Change",
    "zh-CN": "额度变化",
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
  totalInterest: {
    en: "Total Interest Charged",
    "zh-CN": "总利息费用",
  },
  noInterestCharged: {
    en: "No interest was charged this period. All children had positive or zero balances.",
    "zh-CN": "本期未收取利息。所有孩子的余额为正数或零。",
  },
  settlementExplanation: {
    en: "Interest is calculated based on each child's negative balance (debt) at settlement time. Credit limits may be adjusted based on repayment history.",
    "zh-CN": "利息根据结算时每个孩子的负余额（债务）计算。信用额度可能根据还款历史进行调整。",
  },
  unlimited: {
    en: "Unlimited",
    "zh-CN": "无限制",
  },
  stars: {
    en: "stars",
    "zh-CN": "颗星星",
  },
};

/**
 * Get localized text
 * @internal Exported as _settlementT for testing only
 */
function t(key: string, locale: ReportLocale): string {
  return translations[key]?.[locale] || translations[key]?.en || key;
}
export { t as _settlementT };

/**
 * Format date for display
 */
function formatDate(date: Date, locale: ReportLocale): string {
  return date.toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Generate subject line for settlement notice
 */
export function getSettlementNoticeSubject(
  data: SettlementNotificationData,
  locale: ReportLocale
): string {
  return `${t("subject", locale)} - ${data.familyName}`;
}

/**
 * Generate settlement notice HTML content
 */
export function generateSettlementNoticeHtml(
  data: SettlementNotificationData
): string {
  const { locale } = data;
  const dateStr = formatDate(data.settlementDate, locale);

  let content = `
    <h2 style="color: ${colors.secondary}; margin-top: 0;">${t("title", locale)}</h2>
    <p style="color: ${colors.textLight};">${t("settlementDate", locale)}: ${dateStr}</p>
    <p style="font-size: 14px; color: ${colors.textLight}; margin-bottom: 24px;">${t("settlementExplanation", locale)}</p>
  `;

  // Total interest summary
  content += `
    <div class="card" style="text-align: center;">
      <h3 class="card-title">${t("totalInterest", locale)}</h3>
      <div style="font-size: 36px; font-weight: bold; color: ${data.totalInterestCharged > 0 ? colors.error : colors.success};">
        ${data.totalInterestCharged > 0 ? "-" : ""}${data.totalInterestCharged} ${t("stars", locale)}
      </div>
    </div>
  `;

  if (data.children.length === 0 || data.totalInterestCharged === 0) {
    content += `
      <div class="card">
        <p style="text-align: center; color: ${colors.success};">${t("noInterestCharged", locale)}</p>
      </div>
    `;
  } else {
    // Child settlement details
    for (const child of data.children) {
      if (child.interestCharged === 0 && child.creditLimitChange === 0) {
        continue;
      }

      content += `
        <div class="card">
          <h3 class="card-title">${child.name}</h3>

          <table class="data-table">
            <tbody>
              <tr>
                <td style="font-weight: 600;">${t("debtAmount", locale)}</td>
                <td style="text-align: right; color: ${colors.error};">${child.debtAmount} ${t("stars", locale)}</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">${t("interestCharged", locale)}</td>
                <td style="text-align: right; color: ${colors.warning};">-${child.interestCharged} ${t("stars", locale)}</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">${t("creditLimitBefore", locale)}</td>
                <td style="text-align: right;">${child.creditLimitBefore} ${t("stars", locale)}</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">${t("creditLimitAfter", locale)}</td>
                <td style="text-align: right;">${child.creditLimitAfter} ${t("stars", locale)}</td>
              </tr>
              <tr style="background-color: ${colors.background};">
                <td style="font-weight: 600;">${t("creditLimitChange", locale)}</td>
                <td style="text-align: right; font-weight: bold; color: ${child.creditLimitChange >= 0 ? colors.success : colors.error};">
                  ${child.creditLimitChange >= 0 ? "+" : ""}${child.creditLimitChange} ${t("stars", locale)}
                </td>
              </tr>
            </tbody>
          </table>
      `;

      // Interest breakdown table
      if (child.interestBreakdown.length > 0) {
        content += `
          <div style="margin-top: 16px;">
            <strong style="font-size: 12px; color: ${colors.textLight};">${t("interestBreakdown", locale)}</strong>
            <table class="data-table" style="margin-top: 8px; font-size: 14px;">
              <thead>
                <tr>
                  <th style="padding: 8px;">${t("tier", locale)}</th>
                  <th style="padding: 8px;">${t("debtRange", locale)}</th>
                  <th style="padding: 8px;">${t("rate", locale)}</th>
                  <th style="padding: 8px;">${t("debtInTier", locale)}</th>
                  <th style="padding: 8px;">${t("interestAmount", locale)}</th>
                </tr>
              </thead>
              <tbody>
        `;

        for (const tier of child.interestBreakdown) {
          const maxDebtDisplay =
            tier.maxDebt === null ? t("unlimited", locale) : tier.maxDebt;
          content += `
            <tr>
              <td style="padding: 8px;">${tier.tierOrder}</td>
              <td style="padding: 8px;">${tier.minDebt} - ${maxDebtDisplay}</td>
              <td style="padding: 8px;">${(tier.rate * 100).toFixed(1)}%</td>
              <td style="padding: 8px;">${tier.debtInTier}</td>
              <td style="padding: 8px; color: ${colors.error};">-${tier.interestAmount}</td>
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
