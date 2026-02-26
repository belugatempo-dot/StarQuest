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
    <div className="min-h-screen flex items-center justify-center starry-bg overflow-y-auto p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-green-400 star-glow mb-2">
            {t("verification.confirmedTitle")}
          </h1>
        </div>

        <div className="glass-card shadow-lg p-8 text-center">
          <p className="text-slate-300 mb-6 text-lg">
            {t("verification.confirmedMessage")}
          </p>

          <Link
            href={`/${locale}/login`}
            className="inline-block w-full bg-primary text-gray-900 py-3 px-6 rounded-full font-bold hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(255,215,0,0.4)] transition"
          >
            {t("verification.goToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
