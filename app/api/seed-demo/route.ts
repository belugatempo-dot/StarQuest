/**
 * POST /api/seed-demo — Seeds or resets the demo family.
 * Protected by DEMO_SEED_SECRET Bearer token.
 *
 * Modes:
 * - Default: Full cleanup + seed + save snapshot
 * - ?mode=extend: Restore snapshot, seed gap from latest date to today, re-snapshot
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { cleanupDemoFamily } from "@/lib/demo/demo-cleanup";
import { seedDemoFamily } from "@/lib/demo/demo-seed";
import { DEMO_PARENT_EMAIL, DEMO_FAMILY_NAME } from "@/lib/demo/demo-config";
import {
  saveDemoSnapshot,
  restoreDemoData,
  getSnapshotLatestDate,
} from "@/lib/demo/demo-snapshot";

export async function POST(request: NextRequest) {
  // 1. Verify authorization
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");
  const expectedSecret = process.env.DEMO_SEED_SECRET;

  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Service role key required" },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient();
  const mode = new URL(request.url).searchParams.get("mode");

  try {
    if (mode === "extend") {
      // Extend mode: restore snapshot, seed gap, re-snapshot
      await restoreDemoData(adminClient as any);
      const latestDate = await getSnapshotLatestDate(adminClient as any);

      if (!latestDate) {
        return NextResponse.json(
          { error: "No snapshot found. Run a full seed first." },
          { status: 400 }
        );
      }

      const startDate = new Date(latestDate.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date();

      if (startDate >= endDate) {
        return NextResponse.json({
          success: true,
          message: "Snapshot already up to date",
        });
      }

      const result = await seedDemoFamily(adminClient as any, {
        startDate,
        endDate,
      });
      await saveDemoSnapshot(adminClient as any, result.familyId);

      console.log(
        `Demo extend complete: ${result.stats.transactions} new transactions, ${result.stats.days} new days`
      );

      return NextResponse.json({
        success: true,
        mode: "extend",
        stats: result.stats,
      });
    }

    // Default mode: full cleanup + seed + save snapshot
    // AdminClient type is looser than SupabaseClient<Database> to avoid `never` inference
    const cleanup = await cleanupDemoFamily(adminClient as any);
    console.log(
      `Demo cleanup: found=${cleanup.found}, deletedAuthUsers=${cleanup.deletedAuthUsers}`
    );

    const result = await seedDemoFamily(adminClient as any);
    console.log(
      `Demo seed complete: ${result.stats.transactions} transactions, ${result.stats.redemptions} redemptions`
    );

    // Save snapshot for fast restore
    await saveDemoSnapshot(adminClient as any, result.familyId);
    console.log("Demo snapshot saved");

    return NextResponse.json({
      success: true,
      family: {
        id: result.familyId,
        name: DEMO_FAMILY_NAME,
      },
      credentials: {
        parent: {
          email: DEMO_PARENT_EMAIL,
          password: "Set via DEMO_PARENT_PASSWORD env var",
        },
        children: result.children.map((c) => ({
          name: c.name,
          email: c.email,
          password: c.password,
        })),
      },
      stats: result.stats,
    });
  } catch (error) {
    console.error("Demo seed failed:", error);
    return NextResponse.json(
      {
        error: "Seed failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
