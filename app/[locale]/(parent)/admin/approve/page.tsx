import { redirect } from "next/navigation";

export default async function ApproveRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard#approval-center`);
}
