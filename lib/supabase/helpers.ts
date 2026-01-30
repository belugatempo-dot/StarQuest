/**
 * Supabase Query Helpers
 *
 * Typed wrappers around Supabase insert/update operations.
 * These contain a single `as any` cast internally so callers
 * don't need to scatter `as any` throughout the codebase.
 *
 * Why: Supabase's generated types from the Database interface
 * sometimes conflict with the actual query builder API,
 * requiring `as any` casts on `.insert()` and `.update()`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type TableName = keyof Tables;

/**
 * Typed update helper — wraps `supabase.from(table).update(data)`
 * with a single internal `as any` cast.
 */
export function typedUpdate<T extends string & TableName>(
  supabase: SupabaseClient<Database, any, any>,
  table: T,
  data: Partial<Tables[T]["Row"]>
) {
  return (supabase.from(table).update as any)(data);
}

/**
 * Typed insert helper — wraps `supabase.from(table).insert(data)`
 * with a single internal `as any` cast.
 */
export function typedInsert<T extends string & TableName>(
  supabase: SupabaseClient<Database, any, any>,
  table: T,
  data: Tables[T]["Insert"] | Tables[T]["Insert"][]
) {
  return (supabase.from(table).insert as any)(data);
}
