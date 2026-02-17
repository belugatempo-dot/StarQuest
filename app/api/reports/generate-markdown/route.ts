import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchReportBaseData, buildChildrenStats } from "@/lib/reports/report-utils";
import { generateMarkdownReport } from "@/lib/reports/markdown-formatter";
import { getPreviousPeriodBounds, getReportFilename, type PeriodType } from "@/lib/reports/date-ranges";
import type { ReportLocale } from "@/types/reports";

const VALID_PERIOD_TYPES = ["daily", "weekly", "monthly", "quarterly", "yearly"];

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent role
  const { data: profile } = (await supabase
    .from("users")
    .select("id, role, family_id")
    .eq("id", user.id)
    .maybeSingle()) as { data: { id: string; role: string; family_id: string | null } | null; error: any };

  if (!profile || profile.role !== "parent" || !profile.family_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body
  const body = await req.json();
  const { periodType, periodStart, periodEnd, locale: bodyLocale } = body;

  // Validate
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

  // Fetch report data
  const rawData = await fetchReportBaseData(familyId, start, end);
  if (!rawData) {
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }

  const { childrenData, totalEarned, totalSpent } = buildChildrenStats(rawData, locale);

  // Fetch previous period for comparison (skip for daily)
  let previousPeriod: { totalEarned: number; totalSpent: number } | undefined;
  if (periodType !== "daily") {
    const prevBounds = getPreviousPeriodBounds(periodType as PeriodType, start, end);
    const prevRawData = await fetchReportBaseData(familyId, prevBounds.start, prevBounds.end);
    if (prevRawData) {
      const prevStats = buildChildrenStats(prevRawData, locale);
      previousPeriod = {
        totalEarned: prevStats.totalEarned,
        totalSpent: prevStats.totalSpent,
      };
    }
  }

  // Generate markdown
  const markdown = generateMarkdownReport({
    familyName: rawData.family.name,
    locale,
    periodType: periodType as PeriodType,
    periodStart: start,
    periodEnd: end,
    generatedAt: new Date(),
    children: childrenData,
    totalEarned,
    totalSpent,
    previousPeriod,
  });

  const filename = getReportFilename(periodType as PeriodType, start, end);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
