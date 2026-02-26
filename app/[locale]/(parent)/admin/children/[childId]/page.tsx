import { redirect } from "next/navigation";

export default async function ChildDetailRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; childId: string }>;
}) {
  const { locale, childId } = await params;
  redirect(`/${locale}/profile/children/${childId}`);
}
