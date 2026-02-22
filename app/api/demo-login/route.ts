/**
 * POST /api/demo-login — Passwordless demo login via Supabase Admin generateLink.
 *
 * Auto-resets demo data (cleanup + seed) before each login so every
 * demo session starts with fresh, unmodified data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getDemoUser } from "@/lib/demo/demo-users";
import { cleanupDemoFamily } from "@/lib/demo/demo-cleanup";
import { seedDemoFamily } from "@/lib/demo/demo-seed";

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

  // 3. Auto-reset demo data (non-fatal — race conditions are tolerated)
  const adminClient = createAdminClient();
  try {
    // AdminClient type is looser than SupabaseClient<Database> to avoid `never` inference
    await cleanupDemoFamily(adminClient as any);
    await seedDemoFamily(adminClient as any);
    console.log("Demo data reset successfully before login");
  } catch (err) {
    console.warn(
      "Demo data reset failed (concurrent request may have already reset):",
      err instanceof Error ? err.message : String(err)
    );
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
