import { redirect } from "next/navigation";

export default async function RecordRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/record`);
}
