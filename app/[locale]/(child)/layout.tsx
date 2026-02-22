import { requireAuth } from "@/lib/auth";
import ChildNav from "@/components/child/ChildNav";
import { PostHogUserIdentify } from "@/components/analytics/PostHogUserIdentify";
import { DemoProvider } from "@/lib/demo/demo-context";
import { DemoBanner } from "@/components/ui/DemoBanner";

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
    <DemoProvider userEmail={user.email}>
      <div className="min-h-screen bg-background">
        <PostHogUserIdentify user={{ ...user, locale }} />
        <DemoBanner />
        <ChildNav user={user} locale={locale} />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {children}
        </main>
      </div>
    </DemoProvider>
  );
}
