/**
 * POST /api/demo-login — Passwordless demo login via Supabase Admin generateLink.
 *
 * Resets demo data before each login so every demo session starts fresh.
 * Fast path: restore from snapshot (~1 RPC call, ~1s).
 * Fallback: full cleanup + seed + save snapshot (~40 calls, ~10s).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getDemoUser } from "@/lib/demo/demo-users";
import { cleanupDemoFamily } from "@/lib/demo/demo-cleanup";
import { seedDemoFamily } from "@/lib/demo/demo-seed";
import {
  restoreDemoData,
  saveDemoSnapshot,
} from "@/lib/demo/demo-snapshot";

export async function POST(request: NextRequest) {
  // 1. Validate service role key is available
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Demo login not available" },
      { status: 503 }
    );
  }

  // 2. Parse and validate role
  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { role } = body;
  const demoUser = role ? getDemoUser(role) : undefined;

  if (!demoUser) {
    return NextResponse.json(
      { error: "Invalid role. Must be one of: parent, alisa, alexander" },
      { status: 400 }
    );
  }

  // 3. Reset demo data (non-fatal — race conditions are tolerated)
  const adminClient = createAdminClient();
  try {
    // Fast path: restore from pre-computed snapshot (1 RPC call)
    await restoreDemoData(adminClient as any);
    console.log("Demo data restored from snapshot");
  } catch {
    // Fallback: no snapshot yet → full cleanup + seed + save snapshot for next time
    try {
      await cleanupDemoFamily(adminClient as any);
      const result = await seedDemoFamily(adminClient as any);
      await saveDemoSnapshot(adminClient as any, result.familyId);
      console.log("Demo data reset via fallback (cleanup + seed + snapshot saved)");
    } catch (err) {
      console.warn(
        "Demo data reset failed (concurrent request may have already reset):",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // 4. Generate magic link token via Admin API (no email sent)
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: demoUser.email,
  });

  if (error || !data?.properties?.hashed_token) {
    console.error("Demo login generateLink error:", error?.message);
    return NextResponse.json(
      { error: "Failed to generate demo login token" },
      { status: 500 }
    );
  }

  // 5. Return token to client for verifyOtp()
  return NextResponse.json({
    token_hash: data.properties.hashed_token,
    email: demoUser.email,
  });
}
