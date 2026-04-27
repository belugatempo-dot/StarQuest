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
