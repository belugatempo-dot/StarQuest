import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { Toaster } from "sonner";
import "../globals.css";

export const metadata: Metadata = {
  title: "StarQuest | 夺星大闯关",
  description: "Complete quests. Earn stars. Unlock rewards. | 闯关夺星，解锁奖励。",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" style={{ colorScheme: 'dark' }}>
      <body>
        <PostHogProvider>
          <PostHogPageView />
          <ThemeProvider>
            <NextIntlClientProvider messages={messages}>
              {children}
              <Toaster theme="dark" position="bottom-center" />
            </NextIntlClientProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
