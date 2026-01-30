import { createClient, createAdminClient } from "@/lib/supabase/server";
import { typedUpdate } from "@/lib/supabase/helpers";
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
    const { childId, name, email } = await request.json();

    if (!childId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    // Update name in users table
    const { error: updateNameError } = await typedUpdate(supabase, "users", {
        name: name.trim(),
      })
      .eq("id", childId);

    if (updateNameError) {
      throw updateNameError;
    }

    // If email is provided and different, update via RPC function
    const currentEmail = (child as any).email;
    const newEmail = email?.trim() || null;

    if (newEmail && newEmail !== currentEmail) {
      const { error: emailError } = await (supabase.rpc as any)("admin_update_child_email", {
        p_child_id: childId,
        p_new_email: newEmail,
        p_parent_id: (user as any).id,
      });

      if (emailError) {
        throw emailError;
      }
    } else if (!newEmail && currentEmail) {
      // Clear email if it was removed
      const { error: clearEmailError } = await typedUpdate(supabase, "users", {
          email: null,
        })
        .eq("id", childId);

      if (clearEmailError) {
        throw clearEmailError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating child:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update child" },
      { status: 500 }
    );
  }
}
