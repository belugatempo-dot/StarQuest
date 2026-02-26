import { getTranslations } from "next-intl/server";
import RegisterForm from "@/components/auth/RegisterForm";
import Link from "next/link";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center starry-bg overflow-y-auto p-4">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            ⭐ {t("brand.name")}
          </h1>
          <p className="text-slate-400">{t("brand.slogan")}</p>
        </div>

        {/* Register Form Card */}
        <div className="glass-card shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center star-glow">
            {t("auth.registerPrompt")}
          </h2>
          <RegisterForm />

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href={`/${locale}/login`}
              className="text-primary font-semibold hover:underline"
            >
              {t("common.login")}
            </Link>
          </div>

          {/* Demo & Introduction */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center mb-3">
              {t("auth.orExplore")}
            </p>
            <div className="flex gap-3">
              <a
                href="/starquest-visualization.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 border-2 border-primary text-primary rounded-full text-sm font-bold hover:bg-primary/10 transition text-center"
              >
                {t("auth.introduction")}
              </a>
              <Link
                href={`/${locale}/login?demo=true`}
                className="flex-1 px-4 py-2 bg-primary text-gray-900 rounded-full text-sm font-bold hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(255,215,0,0.4)] transition text-center"
              >
                {t("auth.tryDemo")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
