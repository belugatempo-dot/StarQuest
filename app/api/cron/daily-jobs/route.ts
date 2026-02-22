import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { sendEmail, isEmailServiceAvailable } from "@/lib/email/resend";
import type { Database } from "@/types/database";
import {
  generateWeeklyReportData,
  getWeekBounds,
} from "@/lib/reports/generate-weekly";
import {
  generateMonthlyReportData,
  getMonthBounds,
} from "@/lib/reports/generate-monthly";
import {
  generateWeeklyReportHtml,
  getWeeklyReportSubject,
} from "@/lib/email/templates/weekly-report";
import {
  generateMonthlyReportHtml,
  getMonthlyReportSubject,
} from "@/lib/email/templates/monthly-report";
import {
  generateSettlementNoticeHtml,
  getSettlementNoticeSubject,
} from "@/lib/email/templates/settlement-notice";
import type {
  DailyJobsResult,
  ReportLocale,
  SettlementNotificationData,
  ChildSettlementData,
} from "@/types/reports";

/**
 * Unified daily cron handler
 * Runs at 00:00 UTC daily, handles:
 * 1. Settlement (when today matches family settlement_day)
 * 2. Weekly reports (on Sundays)
 * 3. Monthly reports (on settlement day)
 */
export async function GET(request: NextRequest) {
  try {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    const adminClient = createAdminClient();
    const today = new Date();
    const todayDay = today.getUTCDate();
    const isLastDayOfMonth =
      new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)
      ).getUTCDate() === todayDay;
    const isSunday = today.getUTCDay() === 0;

    const results: DailyJobsResult = {
      settlement: null,
      weekly: null,
      monthly: null,
    };

    // 1. Run settlement for families where today is their settlement day
    results.settlement = await runSettlementIfDue(
      adminClient,
      todayDay,
      isLastDayOfMonth
    );

    // 2. Weekly reports on Sundays
    if (isSunday) {
      results.weekly = await runWeeklyReports(adminClient);
    }

    // 3. Monthly reports on settlement day
    results.monthly = await runMonthlyReports(
      adminClient,
      todayDay,
      isLastDayOfMonth
    );

    console.log("Daily jobs completed:", results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("Unexpected error in daily-jobs cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Run settlement for families due today
 */
async function runSettlementIfDue(
  adminClient: ReturnType<typeof createAdminClient>,
  todayDay: number,
  isLastDayOfMonth: boolean
): Promise<{ processed: number; errors: string[] }> {
  const result = { processed: 0, errors: [] as string[] };

  // Get families due for settlement
  // settlement_day = 0 means last day of month
  const settlementFilter = isLastDayOfMonth
    ? `settlement_day.eq.${todayDay},settlement_day.eq.0`
    : `settlement_day.eq.${todayDay}`;
  const { data: families, error } = (await adminClient
    .from("families")
    .select("id, name, settlement_day")
    .or(settlementFilter)) as { data: { id: string; name: string; settlement_day: number }[] | null; error: any };

  if (error) {
    result.errors.push(`Failed to fetch families: ${error.message}`);
    return result;
  }

  if (!families || families.length === 0) {
    return result;
  }

  for (const family of families) {
    try {
      // Run settlement via stored procedure
      const { data, error: settlementError } = await (adminClient.rpc as any)(
        "run_monthly_settlement",
        {
          p_settlement_date: null,
          p_family_id: family.id,
        }
      );

      if (settlementError) {
        result.errors.push(
          `Settlement failed for ${family.name}: ${settlementError.message}`
        );
        continue;
      }

      result.processed++;

      // Send settlement notification email if enabled
      await sendSettlementNotification(adminClient, family.id, family.name);
    } catch (err) {
      result.errors.push(
        `Settlement error for ${family.name}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return result;
}

/**
 * Settlement email result for observability
 */
interface SettlementEmailResult {
  sent: boolean;
  skippedReason?: string;
  error?: string;
}

/**
 * Send settlement notification email
 */
async function sendSettlementNotification(
  adminClient: ReturnType<typeof createAdminClient>,
  familyId: string,
  familyName: string
): Promise<SettlementEmailResult> {
  if (!isEmailServiceAvailable()) {
    console.warn(`Settlement email skipped: email service not available (family: ${familyName})`);
    return { sent: false, skippedReason: "email_service_unavailable" };
  }

  // Check if settlement email is enabled
  const { data: prefs } = (await adminClient
    .from("family_report_preferences")
    .select("*")
    .eq("family_id", familyId)
    .maybeSingle()) as { data: Database["public"]["Tables"]["family_report_preferences"]["Row"] | null };

  if (prefs && !prefs.settlement_email_enabled) {
    console.warn(`Settlement email skipped: disabled in preferences (family: ${familyName})`);
    return { sent: false, skippedReason: "disabled_in_preferences" };
  }

  // Get parent email or override
  const email = await getReportEmail(adminClient, familyId, prefs?.report_email);
  if (!email) {
    console.warn(`Settlement email skipped: no email address found (family: ${familyName})`);
    return { sent: false, skippedReason: "no_email_address" };
  }

  const locale: ReportLocale = (prefs?.report_locale as ReportLocale) || "en";

  // Get today's settlement data
  const today = new Date().toISOString().split("T")[0];
  const { data: settlements } = await adminClient
    .from("credit_settlements")
    .select("*, users!credit_settlements_child_id_fkey(name)")
    .eq("family_id", familyId)
    .eq("settlement_date", today);

  if (!settlements || settlements.length === 0) {
    console.warn(`Settlement email skipped: no settlements found (family: ${familyName})`);
    return { sent: false, skippedReason: "no_settlements_found" };
  }

  const children: ChildSettlementData[] = settlements.map((s: any) => ({
    childId: s.child_id,
    name: s.users?.name || "Unknown",
    debtAmount: s.debt_amount,
    interestCharged: s.interest_calculated,
    interestBreakdown: Array.isArray(s.interest_breakdown)
      ? s.interest_breakdown.map((tier: any) => ({
          tierOrder: tier.tier_order || 0,
          minDebt: tier.min_debt || 0,
          maxDebt: tier.max_debt || null,
          debtInTier: tier.debt_in_tier || 0,
          rate: tier.interest_rate || 0,
          interestAmount: tier.interest_amount || 0,
        }))
      : [],
    creditLimitBefore: s.credit_limit_before,
    creditLimitAfter: s.credit_limit_after,
    creditLimitChange: s.credit_limit_adjustment,
  }));

  const data: SettlementNotificationData = {
    familyId,
    familyName,
    locale,
    settlementDate: new Date(),
    children,
    totalInterestCharged: children.reduce((sum, c) => sum + c.interestCharged, 0),
  };

  const html = generateSettlementNoticeHtml(data);
  const subject = getSettlementNoticeSubject(data, locale);

  const emailResult = await sendEmail({ to: email, subject, html });

  // Audit trail: log to report_history (parity with weekly/monthly reports)
  await (adminClient.from("report_history") as any).insert({
    family_id: familyId,
    report_type: "settlement",
    report_period_start: today,
    report_period_end: today,
    status: emailResult.success ? "sent" : "failed",
    sent_to_email: email,
    sent_at: emailResult.success ? new Date().toISOString() : null,
    error_message: emailResult.error || null,
  });

  if (!emailResult.success) {
    console.error(`Settlement email failed for ${familyName}: ${emailResult.error}`);
    return { sent: false, error: emailResult.error };
  }

  return { sent: true };
}

/**
 * Run weekly reports for all families with it enabled
 */
async function runWeeklyReports(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ sent: number; failed: number; skipped: number }> {
  const result = { sent: 0, failed: 0, skipped: 0 };

  if (!isEmailServiceAvailable()) {
    return result;
  }

  // Get all families
  const { data: families, error } = (await adminClient
    .from("families")
    .select("id, name")) as { data: { id: string; name: string }[] | null; error: any };

  if (error || !families) {
    console.error("Failed to fetch families for weekly reports:", error);
    return result;
  }

  const { weekStart, weekEnd } = getWeekBounds();
  const periodStartStr = weekStart.toISOString().split("T")[0];

  for (const family of families) {
    try {
      // Check preferences
      const { data: prefs } = (await adminClient
        .from("family_report_preferences")
        .select("*")
        .eq("family_id", family.id)
        .maybeSingle()) as { data: Database["public"]["Tables"]["family_report_preferences"]["Row"] | null };

      if (prefs && !prefs.weekly_report_enabled) {
        result.skipped++;
        continue;
      }

      // Check for duplicate
      const { data: existing } = await (adminClient
        .from("report_history") as any)
        .select("id")
        .eq("family_id", family.id)
        .eq("report_type", "weekly")
        .eq("report_period_start", periodStartStr)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      const email = await getReportEmail(
        adminClient,
        family.id,
        prefs?.report_email
      );
      if (!email) {
        result.skipped++;
        continue;
      }

      const locale: ReportLocale =
        (prefs?.report_locale as ReportLocale) || "en";

      // Generate report data
      const reportData = await generateWeeklyReportData(
        family.id,
        weekStart,
        weekEnd,
        locale
      );

      if (!reportData) {
        console.warn(`Weekly report generation failed for ${family.name} (${family.id}) — check fetchReportBaseData logs above`);
        result.failed++;
        continue;
      }

      // Create report history entry
      await (adminClient.from("report_history") as any).insert({
        family_id: family.id,
        report_type: "weekly",
        report_period_start: periodStartStr,
        report_period_end: weekEnd.toISOString().split("T")[0],
        status: "pending",
        sent_to_email: email,
        report_data: reportData as unknown as Record<string, unknown>,
      });

      // Generate and send email
      const html = generateWeeklyReportHtml(reportData);
      const subject = getWeeklyReportSubject(reportData, locale);

      const emailResult = await sendEmail({ to: email, subject, html });

      // Update report history
      await (adminClient
        .from("report_history") as any)
        .update({
          status: emailResult.success ? "sent" : "failed",
          sent_at: emailResult.success ? new Date().toISOString() : null,
          error_message: emailResult.error || null,
        })
        .eq("family_id", family.id)
        .eq("report_type", "weekly")
        .eq("report_period_start", periodStartStr);

      if (emailResult.success) {
        result.sent++;
      } else {
        result.failed++;
      }
    } catch (err) {
      console.error(`Weekly report error for ${family.name}:`, err);
      result.failed++;
    }
  }

  return result;
}

/**
 * Run monthly reports for families where today is settlement day
 */
async function runMonthlyReports(
  adminClient: ReturnType<typeof createAdminClient>,
  todayDay: number,
  isLastDayOfMonth: boolean
): Promise<{ sent: number; failed: number; skipped: number }> {
  const result = { sent: 0, failed: 0, skipped: 0 };

  if (!isEmailServiceAvailable()) {
    return result;
  }

  // Get families due for monthly report (same logic as settlement)
  const monthlyFilter = isLastDayOfMonth
    ? `settlement_day.eq.${todayDay},settlement_day.eq.0`
    : `settlement_day.eq.${todayDay}`;
  const { data: families, error } = (await adminClient
    .from("families")
    .select("id, name, settlement_day")
    .or(monthlyFilter)) as { data: { id: string; name: string; settlement_day: number }[] | null; error: any };

  if (error || !families || families.length === 0) {
    return result;
  }

  const { monthStart, monthEnd } = getMonthBounds();
  const periodStartStr = monthStart.toISOString().split("T")[0];

  for (const family of families) {
    try {
      // Check preferences
      const { data: prefs } = (await adminClient
        .from("family_report_preferences")
        .select("*")
        .eq("family_id", family.id)
        .maybeSingle()) as { data: Database["public"]["Tables"]["family_report_preferences"]["Row"] | null };

      if (prefs && !prefs.monthly_report_enabled) {
        result.skipped++;
        continue;
      }

      // Check for duplicate
      const { data: existing } = await (adminClient
        .from("report_history") as any)
        .select("id")
        .eq("family_id", family.id)
        .eq("report_type", "monthly")
        .eq("report_period_start", periodStartStr)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      const email = await getReportEmail(
        adminClient,
        family.id,
        prefs?.report_email
      );
      if (!email) {
        result.skipped++;
        continue;
      }

      const locale: ReportLocale =
        (prefs?.report_locale as ReportLocale) || "en";

      // Generate report data
      const reportData = await generateMonthlyReportData(
        family.id,
        monthStart,
        monthEnd,
        locale
      );

      if (!reportData) {
        console.warn(`Monthly report generation failed for ${family.name} (${family.id}) — check fetchReportBaseData logs above`);
        result.failed++;
        continue;
      }

      // Create report history entry
      await (adminClient.from("report_history") as any).insert({
        family_id: family.id,
        report_type: "monthly",
        report_period_start: periodStartStr,
        report_period_end: monthEnd.toISOString().split("T")[0],
        status: "pending",
        sent_to_email: email,
        report_data: reportData as unknown as Record<string, unknown>,
      });

      // Generate and send email
      const html = generateMonthlyReportHtml(reportData);
      const subject = getMonthlyReportSubject(reportData, locale);

      const emailResult = await sendEmail({ to: email, subject, html });

      // Update report history
      await (adminClient
        .from("report_history") as any)
        .update({
          status: emailResult.success ? "sent" : "failed",
          sent_at: emailResult.success ? new Date().toISOString() : null,
          error_message: emailResult.error || null,
        })
        .eq("family_id", family.id)
        .eq("report_type", "monthly")
        .eq("report_period_start", periodStartStr);

      if (emailResult.success) {
        result.sent++;
      } else {
        result.failed++;
      }
    } catch (err) {
      console.error(`Monthly report error for ${family.name}:`, err);
      result.failed++;
    }
  }

  return result;
}

/**
 * Get the email address to send reports to
 */
async function getReportEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  familyId: string,
  overrideEmail: string | null | undefined
): Promise<string | null> {
  if (overrideEmail) {
    return overrideEmail;
  }

  // Get parent email
  const { data: parent } = (await adminClient
    .from("users")
    .select("email")
    .eq("family_id", familyId)
    .eq("role", "parent")
    .limit(1)
    .maybeSingle()) as { data: { email: string | null } | null };

  return parent?.email || null;
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
