/**
 * Demo data snapshot — save/restore demo family data via single SQL function calls.
 * Reduces demo login from ~40 round trips to 1-2.
 */

type AdminClient = {
  from: (table: string) => any;
  rpc: (fn: string, params?: Record<string, unknown>) => any;
};

/**
 * Save current demo family data as a JSONB snapshot in Supabase.
 * Called after seed to pre-compute data for fast restore.
 */
export async function saveDemoSnapshot(
  supabase: AdminClient,
  familyId: string
): Promise<void> {
  const { error } = await supabase.rpc("save_demo_snapshot", {
    p_family_id: familyId,
  });

  if (error) {
    throw new Error(`Failed to save demo snapshot: ${error.message}`);
  }
}

/**
 * Restore demo family data from snapshot via a single SQL function call.
 * Atomically deletes existing data and re-inserts from snapshot.
 */
export async function restoreDemoData(
  supabase: AdminClient
): Promise<void> {
  const { error } = await supabase.rpc("restore_demo_data");

  if (error) {
    throw new Error(`Failed to restore demo data: ${error.message}`);
  }
}

/**
 * Get the latest star_transaction date from the snapshot.
 * Used by extend mode to know where to start generating new data.
 */
export async function getSnapshotLatestDate(
  supabase: AdminClient
): Promise<Date | null> {
  const { data, error } = await supabase
    .from("demo_data_snapshot")
    .select("rows")
    .eq("table_name", "star_transactions")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read snapshot: ${error.message}`);
  }

  if (!data?.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
    return null;
  }

  // Find the maximum created_at among all star transactions
  let latest: Date | null = null;
  for (const row of data.rows) {
    const d = new Date(row.created_at);
    if (!latest || d > latest) {
      latest = d;
    }
  }

  return latest;
}
