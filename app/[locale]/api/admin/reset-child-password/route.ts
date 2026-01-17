import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check if user is authenticated and is a parent
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (!user || (user as any).role !== "parent") {
      return NextResponse.json({ error: "Forbidden - Parents only" }, { status: 403 });
    }

    // Get request body
    const { childId, newPassword } = await request.json();

    if (!childId || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Verify child belongs to same family (use adminClient to bypass RLS)
    const { data: child } = await adminClient
      .from("users")
      .select("*")
      .eq("id", childId)
      .maybeSingle();

    if (!child || (child as any).family_id !== (user as any).family_id || (child as any).role !== "child") {
      return NextResponse.json({ error: "Child not found or access denied" }, { status: 404 });
    }

    // Note: Supabase doesn't provide admin.updateUser in the client SDK
    // We need to use the service role key for this operation
    // For now, we'll use a database function as a workaround

    // Alternative: Use RPC to call a secure function
    const { data, error } = await (supabase.rpc as any)("admin_reset_child_password", {
      p_child_id: childId,
      p_new_password: newPassword,
      p_parent_id: (user as any).id,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
