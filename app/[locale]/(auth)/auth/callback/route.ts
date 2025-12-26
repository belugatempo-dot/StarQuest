import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  // Extract locale from pathname (e.g., /en/auth/callback -> en)
  const pathParts = pathname.split("/").filter(Boolean);
  const locale = pathParts[0] || "en";

  if (token_hash && type) {
    const supabase = await createClient();

    // Validate type parameter and default to 'email'
    const validTypes: EmailOtpType[] = ['email', 'recovery', 'invite', 'email_change'];
    const otpType = validTypes.includes(type as EmailOtpType)
      ? (type as EmailOtpType)
      : 'email';

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    });

    if (!error) {
      console.log("✅ Email verification successful");
      return NextResponse.redirect(`${origin}/${locale}/auth/confirmed`);
    }

    // Enhanced error logging for debugging
    console.error("❌ Verification error:", {
      message: error.message,
      status: error.status,
      token_hash_length: token_hash?.length,
      type_received: type,
      type_used: otpType,
    });
  }

  // Error - redirect back to verify-email with error
  return NextResponse.redirect(
    `${origin}/${locale}/auth/verify-email?error=invalid_token`
  );
}
