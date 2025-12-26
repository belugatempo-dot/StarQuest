import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import ResendVerificationButton from "@/components/auth/ResendVerificationButton";
import Link from "next/link";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { email: emailParam, error } = await searchParams;
  const t = await getTranslations();

  // Try to get email from params or session
  let email = emailParam;
  if (!email) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/20 to-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            {t("verification.checkEmailTitle")}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error === "invalid_token" && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {t("verification.invalidToken")}
            </div>
          )}

          <p className="text-gray-700 mb-4">
            {t("verification.checkEmailMessage")}
          </p>
          {email && (
            <p className="font-semibold text-lg mb-6 text-center text-secondary">
              {email}
            </p>
          )}
          <p className="text-gray-600 mb-6">
            {t("verification.instructions")}
          </p>

          <div className="border-t pt-6">
            <p className="text-sm text-gray-600 mb-3">
              {t("verification.didntReceive")}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {t("verification.checkSpam")}
            </p>

            {email && <ResendVerificationButton email={email} locale={locale} />}
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            <Link href={`/${locale}/login`} className="text-secondary font-semibold hover:underline">
              {t("common.login")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
