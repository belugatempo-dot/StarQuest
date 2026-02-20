/**
 * POST /api/demo-login — Passwordless demo login via Supabase Admin generateLink.
 *
 * Generates a one-time magic link token server-side (no email sent),
 * which the client uses with verifyOtp() to establish a browser session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getDemoUser } from "@/lib/demo/demo-users";

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

  // 3. Generate magic link token via Admin API (no email sent)
  const adminClient = createAdminClient();
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

  // 4. Return token to client for verifyOtp()
  return NextResponse.json({
    token_hash: data.properties.hashed_token,
    email: demoUser.email,
  });
}
