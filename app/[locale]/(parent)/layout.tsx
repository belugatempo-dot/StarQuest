import { requireParent } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import { PostHogUserIdentify } from "@/components/analytics/PostHogUserIdentify";
import { DemoProvider } from "@/lib/demo/demo-context";
import { DemoBanner } from "@/components/ui/DemoBanner";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireParent(locale);

  return (
    <DemoProvider userEmail={user.email}>
      <div className="min-h-screen bg-background">
        <PostHogUserIdentify user={{ ...user, locale }} />
        <DemoBanner />
        <AdminNav user={user} locale={locale} />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
      </div>
    </DemoProvider>
  );
}
