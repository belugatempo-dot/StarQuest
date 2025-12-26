import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is a parent
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (!user || user.role !== "parent") {
      return NextResponse.json({ error: "Forbidden - Parents only" }, { status: 403 });
    }

    // Get request body
    const { childId } = await request.json();

    if (!childId) {
      return NextResponse.json({ error: "Missing childId" }, { status: 400 });
    }

    // Verify child belongs to same family
    const { data: child } = await supabase
      .from("users")
      .select("*")
      .eq("id", childId)
      .single();

    if (!child || child.family_id !== user.family_id || child.role !== "child") {
      return NextResponse.json({ error: "Child not found or access denied" }, { status: 404 });
    }

    // Delete child user
    // Note: When we delete from users table, it should cascade to other tables
    // But we need to delete from auth.users first (requires admin API)
    // For now, we'll use a database function

    const { data, error } = await supabase.rpc("admin_delete_child", {
      p_child_id: childId,
      p_parent_id: user.id,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting child:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete child" },
      { status: 500 }
    );
  }
}
