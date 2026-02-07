import type { WeeklyReportData, ReportLocale } from "@/types/reports";
import { baseLayout, colors, type BilingualText } from "./base-layout";

/**
 * Weekly report specific translations
 */
const translations: Record<string, BilingualText> = {
  subject: {
    en: "StarQuest Weekly Report",
    "zh-CN": "夺星大闯关 周报",
  },
  greeting: {
    en: "Hi",
    "zh-CN": "你好",
  },
  weekSummary: {
    en: "Weekly Star Summary",
    "zh-CN": "每周星星汇总",
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
    en: "No activity this week",
    "zh-CN": "本周无活动",
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
    en: "Week of",
    "zh-CN": "周期",
  },
};

/**
 * Get localized text
 * @internal Exported as _weeklyT for testing only
 */
function t(key: string, locale: ReportLocale): string {
  return translations[key]?.[locale] || translations[key]?.en || key;
}
export { t as _weeklyT };

/**
 * Format date for display
 */
function formatDate(date: Date, locale: ReportLocale): string {
  return date.toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Generate subject line for weekly report
 */
export function getWeeklyReportSubject(
  data: WeeklyReportData,
  locale: ReportLocale
): string {
  return `${t("subject", locale)} - ${data.familyName}`;
}

/**
 * Generate weekly report HTML content
 */
export function generateWeeklyReportHtml(data: WeeklyReportData): string {
  const { locale } = data;
  const periodStr = `${formatDate(data.periodStart, locale)} - ${formatDate(data.periodEnd, locale)}`;

  let content = `
    <h2 style="color: ${colors.secondary}; margin-top: 0;">${t("weekSummary", locale)}</h2>
    <p style="color: ${colors.textLight};">${t("periodLabel", locale)}: ${periodStr}</p>

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
    </div>
  `;

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

      // Credit activity (if any)
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

  return baseLayout(content, locale);
}
