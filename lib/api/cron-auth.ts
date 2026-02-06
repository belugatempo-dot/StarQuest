import { NextRequest, NextResponse } from "next/server";

/**
 * Verify that a request is authorized for cron execution.
 * Returns null if authorized, or an error NextResponse if not.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isVercelCron = request.headers.get("x-vercel-cron") === "true";
  const hasValidAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
