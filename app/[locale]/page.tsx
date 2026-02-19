import { getTranslations } from "next-intl/server";
import Link from "next/link";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/20 to-background p-8">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="text-center space-y-8 max-w-4xl">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-primary">
            ⭐ {t("brand.name")}
          </h1>
          <p className="text-2xl text-slate-300">{t("brand.slogan")}</p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 dark-card rounded-lg shadow-md">
            <div className="text-4xl mb-2">📋</div>
            <h3 className="text-xl font-semibold mb-2">{t("common.quests")}</h3>
            <p className="text-slate-400">Complete daily tasks and positive behaviors</p>
          </div>
          <div className="p-6 dark-card rounded-lg shadow-md">
            <div className="text-4xl mb-2">⭐</div>
            <h3 className="text-xl font-semibold mb-2">{t("common.stars")}</h3>
            <p className="text-slate-400">Earn stars for every achievement</p>
          </div>
          <div className="p-6 dark-card rounded-lg shadow-md">
            <div className="text-4xl mb-2">🎁</div>
            <h3 className="text-xl font-semibold mb-2">{t("common.rewards")}</h3>
            <p className="text-slate-400">Redeem exciting rewards with your stars</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mt-12">
          <Link
            href={`/${locale}/login`}
            className="px-8 py-3 bg-secondary text-white rounded-lg font-semibold hover:bg-secondary/90 transition"
          >
            {t("common.login")}
          </Link>
          <Link
            href={`/${locale}/register`}
            className="px-8 py-3 bg-primary text-gray-900 rounded-lg font-semibold hover:bg-primary/90 transition"
          >
            {t("common.register")}
          </Link>
        </div>

        {/* Demo & Introduction */}
        <div className="flex flex-wrap gap-4 justify-center mt-4">
          <a
            href="/starquest-visualization.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 border border-slate-600 text-slate-300 rounded-lg font-semibold hover:bg-slate-800 transition"
          >
            {t("auth.introduction")}
          </a>
          <Link
            href={`/${locale}/login?demo=true`}
            className="px-8 py-3 border border-primary/50 text-primary rounded-lg font-semibold hover:bg-primary/10 transition"
          >
            {t("auth.tryDemo")}
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 text-slate-400 text-sm">
          <p>© 2026 Beluga Tempo | 鲸律</p>
        </div>
      </div>
    </div>
  );
}
