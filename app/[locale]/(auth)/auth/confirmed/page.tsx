import { getTranslations } from "next-intl/server";
import Link from "next/link";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export default async function ConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-night-cosmic/60 to-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            {t("verification.confirmedTitle")}
          </h1>
        </div>

        <div className="bg-surface rounded-lg shadow-lg p-8 text-center">
          <p className="text-slate-300 mb-6 text-lg">
            {t("verification.confirmedMessage")}
          </p>

          <Link
            href={`/${locale}/login`}
            className="inline-block w-full bg-secondary text-white py-3 px-6 rounded-lg font-semibold hover:bg-secondary/90 transition"
          >
            {t("verification.goToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
