import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check if user is authenticated
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a parent
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (!user || (user as any).role !== "parent") {
      return NextResponse.json({ error: "Forbidden - Parents only" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const {
      familyId,
      reportEmail,
      weeklyReportEnabled,
      monthlyReportEnabled,
      settlementEmailEnabled,
      timezone,
      reportLocale,
    } = body;

    if (!familyId) {
      return NextResponse.json({ error: "Missing familyId" }, { status: 400 });
    }

    // Verify family matches
    if (familyId !== (user as any).family_id) {
      return NextResponse.json({ error: "Family mismatch" }, { status: 403 });
    }

    // Upsert preferences using admin client (bypasses RLS/PostgREST cache issues)
    const { error } = await (adminClient
      .from("family_report_preferences") as any)
      .upsert(
        {
          family_id: familyId,
          report_email: reportEmail || null,
          weekly_report_enabled: weeklyReportEnabled ?? true,
          monthly_report_enabled: monthlyReportEnabled ?? true,
          settlement_email_enabled: settlementEmailEnabled ?? true,
          timezone: timezone || "UTC",
          report_locale: reportLocale || "en",
        },
        { onConflict: "family_id" }
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving report preferences:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save preferences" },
      { status: 500 }
    );
  }
}
