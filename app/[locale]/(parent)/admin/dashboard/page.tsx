import { redirect } from "next/navigation";

export default async function AdminDashboardRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/activities`);
}
