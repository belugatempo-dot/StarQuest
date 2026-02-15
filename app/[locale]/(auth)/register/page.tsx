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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-night-cosmic/60 to-background p-4">
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
        <div className="bg-surface rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            {t("auth.registerPrompt")}
          </h2>
          <RegisterForm />

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href={`/${locale}/login`}
              className="text-secondary font-semibold hover:underline"
            >
              {t("common.login")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
