import { requireParent } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import FamilyMemberList from "@/components/admin/FamilyMemberList";

export default async function FamilyManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const t = await getTranslations();

  // Fetch all family members (try adminClient first, fallback to regular client)
  let members: any[] | null = null;

  // Try admin client first (bypasses RLS)
  const adminResult = await adminClient
    .from("users")
    .select("*")
    .eq("family_id", user.family_id!)
    .order("role", { ascending: false }) // parents first
    .order("created_at", { ascending: true });

  if (adminResult.error) {
    console.error("Admin client error fetching family members:", adminResult.error);
  } else {
    members = adminResult.data;
  }

  // Fallback to regular client if admin client returned no data
  if (!members || members.length === 0) {
    console.log("Trying regular client as fallback for members query...");
    const regularResult = await supabase
      .from("users")
      .select("*")
      .eq("family_id", user.family_id!)
      .order("role", { ascending: false })
      .order("created_at", { ascending: true });

    if (regularResult.error) {
      console.error("Regular client error fetching family members:", regularResult.error);
    } else if (regularResult.data && regularResult.data.length > 0) {
      members = regularResult.data;
      console.log("Found members using regular client:", members.length);
    }
  }

  // Fetch family info
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("*")
    .eq("id", user.family_id!)
    .maybeSingle();

  if (familyError) {
    console.error("Error fetching family:", familyError);
  }

  // Separate parents and children
  const parents = members?.filter((m: any) => m.role === "parent") || [];
  const children = members?.filter((m: any) => m.role === "child") || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t("family.title")}
        </h1>
        <p className="text-gray-600">
          {t("family.subtitle")}: <span className="font-semibold">{(family as any)?.name}</span>
        </p>
      </div>

      {/* Family Member List Component */}
      <FamilyMemberList
        parents={parents}
        children={children}
        currentUser={user}
        locale={locale}
      />
    </div>
  );
}
