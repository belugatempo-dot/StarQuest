import { redirect } from "next/navigation";

export default async function RewardsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/rewards`);
}
