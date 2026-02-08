/**
 * Demo family cleanup — deletes all demo family data in dependency order.
 */

import { DEMO_PARENT_EMAIL } from "./demo-config";

/**
 * Loose Supabase client type for demo cleanup.
 * The generated Database types don't include Relationships,
 * causing `never` inference with SupabaseClient<Database>.
 */
type AdminClient = {
  from: (table: string) => any;
  auth: { admin: { deleteUser: (id: string) => any } };
};

export interface CleanupResult {
  found: boolean;
  familyId: string | null;
  deletedAuthUsers: number;
}

/**
 * Delete all demo family data. Safe to call when no demo family exists.
 * Deletes in FK dependency order since most tables lack ON DELETE CASCADE.
 */
export async function cleanupDemoFamily(
  supabase: AdminClient
): Promise<CleanupResult> {
  // 1. Find the demo parent user
  const { data: parentUser } = await supabase
    .from("users")
    .select("id, family_id")
    .eq("email", DEMO_PARENT_EMAIL)
    .maybeSingle();

  if (!parentUser || !parentUser.family_id) {
    return { found: false, familyId: null, deletedAuthUsers: 0 };
  }

  const familyId = parentUser.family_id;

  // 2. Get all family members (for auth user cleanup)
  const { data: familyUsers } = await supabase
    .from("users")
    .select("id")
    .eq("family_id", familyId);

  const userIds = (familyUsers ?? []).map((u: { id: string }) => u.id);

  // 3. Delete in FK dependency order (most tables lack CASCADE)
  const tablesToDelete = [
    "credit_transactions",
    "credit_settlements",
    "child_credit_settings",
    "credit_interest_tiers",
    "star_transactions",
    "redemptions",
    "report_history",
    "family_report_preferences",
    "family_invites",
    "rewards",
    "quests",
    "levels",
    "quest_categories",
    "users",
    "families",
  ];

  for (const table of tablesToDelete) {
    const column = table === "families" ? "id" : "family_id";
    await supabase.from(table).delete().eq(column, familyId);
  }

  // 4. Delete auth users
  let deletedAuthUsers = 0;
  for (const userId of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (!error) deletedAuthUsers++;
  }

  return { found: true, familyId, deletedAuthUsers };
}
