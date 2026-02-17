import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronAuth } from "@/lib/api/cron-auth";

// Vercel Cron Job - runs monthly on the 1st at 00:01 UTC
// Configured in vercel.json

export async function GET(request: NextRequest) {
  try {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    const adminClient = createAdminClient();

    // Get optional params from query string (for testing/manual triggering)
    const searchParams = request.nextUrl.searchParams;
    const settlementDateParam = searchParams.get("date");
    const familyIdParam = searchParams.get("family_id");

    // Run the monthly settlement
    const { data, error } = await (adminClient.rpc as any)("run_monthly_settlement", {
      p_settlement_date: settlementDateParam || null,
      p_family_id: familyIdParam || null,
    });

    if (error) {
      console.error("Settlement error:", error);
      return NextResponse.json(
        { error: "Settlement failed", details: error.message },
        { status: 500 }
      );
    }

    console.log("Settlement completed:", data);

    return NextResponse.json({
      success: true,
      message: "Monthly settlement completed",
      result: data,
    });
  } catch (error) {
    console.error("Unexpected error in settlement cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering from admin UI
export async function POST(request: NextRequest) {
  return GET(request);
}
