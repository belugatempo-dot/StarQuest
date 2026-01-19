import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Vercel Cron Job - runs monthly on the 1st at 00:01 UTC
// Configured in vercel.json

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron or has valid authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Check if this is a Vercel Cron request or has valid auth
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";
    const hasValidAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !hasValidAuth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Get optional settlement date from query params (for testing)
    const searchParams = request.nextUrl.searchParams;
    const settlementDateParam = searchParams.get("date");

    // Run the monthly settlement
    const { data, error } = await (adminClient.rpc as any)("run_monthly_settlement", {
      p_settlement_date: settlementDateParam || null,
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
