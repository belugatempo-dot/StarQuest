import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
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
      email: string;
      locale: string;
    };

    // Validate required fields
    if (!familyId || !email || !locale) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
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
    const { data: inviteCode, error: rpcError } = await (
      supabase.rpc as any
    )("create_family_invite", {
      p_family_id: familyId,
    });

    if (rpcError || !inviteCode) {
      console.error("Failed to create invite:", rpcError);
      return NextResponse.json(
        { success: false, error: "Failed to generate invite code" },
        { status: 500 }
      );
    }

    // Build and send the email
    const reportLocale: ReportLocale = locale === "zh-CN" ? "zh-CN" : "en";
    const emailData = {
      inviterName,
      familyName,
      inviteCode: inviteCode as string,
      locale: reportLocale,
    };

    const html = generateInviteParentHtml(emailData);
    const subject = getInviteParentSubject(emailData);

    const result = await sendEmail({
      to: email,
      subject,
      html,
    });

    if (!result.success) {
      console.error("Failed to send invite email:", result.error);
      return NextResponse.json(
        { success: false, error: "Failed to send invitation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Invite parent API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
