/**
 * Types for the automated email report system
 */

export type ReportLocale = "en" | "zh-CN";
export type ReportType = "weekly" | "monthly" | "settlement";
export type ReportStatus = "pending" | "sent" | "failed" | "skipped";

/**
 * Quest summary for reports
 */
export interface QuestSummary {
  name: string;
  stars: number;
  count: number;
}

/**
 * Per-child weekly data
 */
export interface ChildWeeklyData {
  childId: string;
  name: string;
  starsEarned: number;
  starsSpent: number;
  netStars: number;
  currentBalance: number;
  creditBorrowed: number;
  creditRepaid: number;
  topQuests: QuestSummary[];
  pendingRequestsCount: number;
}

/**
 * Weekly report data structure
 */
export interface WeeklyReportData {
  familyId: string;
  familyName: string;
  locale: ReportLocale;
  periodStart: Date;
  periodEnd: Date;
  children: ChildWeeklyData[];
  totalStarsEarned: number;
  totalStarsSpent: number;
}

/**
 * Settlement data for a child
 */
export interface ChildSettlementData {
  childId: string;
  name: string;
  debtAmount: number;
  interestCharged: number;
  interestBreakdown: InterestTierBreakdown[];
  creditLimitBefore: number;
  creditLimitAfter: number;
  creditLimitChange: number;
}

/**
 * Interest tier breakdown for settlement
 */
export interface InterestTierBreakdown {
  tierOrder: number;
  minDebt: number;
  maxDebt: number | null;
  debtInTier: number;
  rate: number;
  interestAmount: number;
}

/**
 * Monthly report data (extends weekly with settlement info)
 */
export interface MonthlyReportData extends WeeklyReportData {
  settlementData?: ChildSettlementData[];
  previousMonthComparison?: {
    starsEarnedChange: number;
    starsSpentChange: number;
  };
}

/**
 * Settlement notification data
 */
export interface SettlementNotificationData {
  familyId: string;
  familyName: string;
  locale: ReportLocale;
  settlementDate: Date;
  children: ChildSettlementData[];
  totalInterestCharged: number;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Report generation result
 */
export interface ReportGenerationResult {
  success: boolean;
  data?: WeeklyReportData | MonthlyReportData | SettlementNotificationData;
  error?: string;
}

/**
 * Family report preferences
 */
export interface FamilyReportPreferences {
  id: string;
  familyId: string;
  reportEmail: string | null;
  weeklyReportEnabled: boolean;
  monthlyReportEnabled: boolean;
  settlementEmailEnabled: boolean;
  timezone: string;
  reportLocale: ReportLocale;
  createdAt: string;
  updatedAt: string;
}

/**
 * Report history entry
 */
export interface ReportHistoryEntry {
  id: string;
  familyId: string;
  reportType: ReportType;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  status: ReportStatus;
  sentToEmail: string | null;
  reportData: Record<string, unknown> | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

/**
 * Cron job result for daily jobs
 */
export interface DailyJobsResult {
  settlement: {
    processed: number;
    errors: string[];
  } | null;
  weekly: {
    sent: number;
    failed: number;
    skipped: number;
  } | null;
  monthly: {
    sent: number;
    failed: number;
    skipped: number;
  } | null;
}
