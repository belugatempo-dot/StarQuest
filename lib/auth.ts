import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";

export type User = Database["public"]["Tables"]["users"]["Row"];

async function getUserImpl(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return user;
}

// Deduplicate auth calls within a single server request.
// Layout and page both call requireAuth() → getUser(), but React's cache()
// ensures only one actual network roundtrip per request.
export const getUser = cache(getUserImpl);

export async function requireAuth(locale: string = "en") {
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return user;
}

export async function requireParent(locale: string = "en") {
  const user = await requireAuth(locale);

  if (user.role !== "parent") {
    redirect(`/${locale}/activities`);
  }

  return user;
}

export async function signOut(locale: string = "en") {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
