/**
 * POST /api/seed-demo — Seeds or resets the demo family.
 * Protected by DEMO_SEED_SECRET Bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { cleanupDemoFamily } from "@/lib/demo/demo-cleanup";
import { seedDemoFamily } from "@/lib/demo/demo-seed";
import { DEMO_PARENT_EMAIL, DEMO_FAMILY_NAME } from "@/lib/demo/demo-config";

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

  try {
    // 3. Clean up existing demo family
    // AdminClient type is looser than SupabaseClient<Database> to avoid `never` inference
    const cleanup = await cleanupDemoFamily(adminClient as any);
    console.log(
      `Demo cleanup: found=${cleanup.found}, deletedAuthUsers=${cleanup.deletedAuthUsers}`
    );

    // 4. Seed new demo family
    const result = await seedDemoFamily(adminClient as any);
    console.log(
      `Demo seed complete: ${result.stats.transactions} transactions, ${result.stats.redemptions} redemptions`
    );

    // 5. Return result
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
