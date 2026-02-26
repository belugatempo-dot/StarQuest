import { redirect } from "next/navigation";

export default async function ProfileRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/profile`);
}
