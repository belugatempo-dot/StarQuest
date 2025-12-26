import { requireAuth } from "@/lib/auth";
import ChildNav from "@/components/child/ChildNav";

export default async function ChildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);

  return (
    <div className="min-h-screen bg-background">
      <ChildNav user={user} locale={locale} />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
