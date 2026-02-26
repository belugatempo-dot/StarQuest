import { redirect } from "next/navigation";

export default async function QuestsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/quests`);
}
