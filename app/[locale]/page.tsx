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
            <div className="text-5xl mb-3">📋</div>
            <h3 className="text-2xl font-semibold mb-2">{t("common.quests")}</h3>
            <p className="text-base text-slate-400">Complete daily tasks and positive behaviors</p>
          </div>
          <div className="p-6 dark-card rounded-lg shadow-md">
            <div className="text-5xl mb-3">⭐</div>
            <h3 className="text-2xl font-semibold mb-2">{t("common.stars")}</h3>
            <p className="text-base text-slate-400">Earn stars for every achievement</p>
          </div>
          <div className="p-6 dark-card rounded-lg shadow-md">
            <div className="text-5xl mb-3">🎁</div>
            <h3 className="text-2xl font-semibold mb-2">{t("common.rewards")}</h3>
            <p className="text-base text-slate-400">Redeem exciting rewards with your stars</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-4 mt-12">
          {/* Primary actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={`/${locale}/login?demo=true`}
              className="px-10 py-3.5 text-lg bg-primary text-gray-900 rounded-full font-bold hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(255,215,0,0.4)] transition-all"
            >
              ✨ {t("auth.tryDemo")}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="px-10 py-3.5 text-lg bg-white/10 text-white rounded-full font-semibold border border-white/20 hover:bg-white/20 transition-all"
            >
              {t("common.login")}
            </Link>
          </div>
          {/* Secondary actions */}
          <div className="flex flex-wrap gap-6 justify-center mt-1">
            <Link
              href={`/${locale}/register`}
              className="text-sm text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-500 hover:decoration-white transition-all"
            >
              {t("common.register")}
            </Link>
            <a
              href="/starquest-visualization.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-500 hover:decoration-white transition-all"
            >
              {t("auth.introduction")} →
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-slate-400 text-sm">
          <p>© 2026 Beluga Tempo | 鲸律</p>
        </div>
      </div>
    </div>
  );
}
