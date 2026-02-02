import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, isEmailServiceAvailable } from "@/lib/email/resend";
import {
  generateInviteParentHtml,
  getInviteParentSubject,
} from "@/lib/email/templates/invite-parent";
import type { ReportLocale } from "@/types/reports";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyId, email, locale } = body as {
      familyId: string;
      email?: string;
      locale: string;
    };

    // Validate required fields (email is now optional)
    if (!familyId || !locale) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If email provided, validate format
    const trimmedEmail = email?.trim() || "";
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          { success: false, error: "Invalid email address" },
          { status: 400 }
        );
      }
    }

    // Authenticate the requesting user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the user is a parent in this family
    const { data: profile } = (await supabase
      .from("users")
      .select("name, role, family_id")
      .eq("id", user.id)
      .single()) as { data: { name: string; role: string; family_id: string } | null; error: any };

    if (!profile || profile.role !== "parent" || profile.family_id !== familyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get family name
    const { data: family } = (await supabase
      .from("families")
      .select("name")
      .eq("id", familyId)
      .single()) as { data: { name: string } | null; error: any };

    const familyName = family?.name || "StarQuest Family";
    const inviterName = profile.name || "A parent";

    // Generate invite code via existing RPC
    let inviteCode: string;
    try {
      const { data, error: rpcError } = await (
        supabase.rpc as any
      )("create_family_invite", {
        p_family_id: familyId,
      });

      if (rpcError) {
        return NextResponse.json(
          { success: false, error: `RPC error: ${rpcError.message}` },
          { status: 500 }
        );
      }
      if (!data) {
        return NextResponse.json(
          { success: false, error: "RPC returned no invite code" },
          { status: 500 }
        );
      }
      inviteCode = data as string;
    } catch (rpcErr) {
      const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
      return NextResponse.json(
        { success: false, error: `RPC exception: ${msg}` },
        { status: 500 }
      );
    }

    // Try sending email if email provided and service available
    let emailSent = false;
    if (trimmedEmail && isEmailServiceAvailable()) {
      try {
        const reportLocale: ReportLocale = locale === "zh-CN" ? "zh-CN" : "en";
        const emailData = {
          inviterName,
          familyName,
          inviteCode,
          locale: reportLocale,
        };

        const html = generateInviteParentHtml(emailData);
        const subject = getInviteParentSubject(emailData);

        const result = await sendEmail({
          to: trimmedEmail,
          subject,
          html,
        });

        emailSent = result.success;
      } catch {
        // Email failure is not fatal — invite code is on screen
        emailSent = false;
      }
    }

    return NextResponse.json({ success: true, inviteCode, emailSent });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Invite parent API error:", message);
    return NextResponse.json(
      { success: false, error: message || "Internal server error" },
      { status: 500 }
    );
  }
}
