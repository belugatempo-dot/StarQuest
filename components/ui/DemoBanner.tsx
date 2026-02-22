"use client";

/**
 * Persistent banner shown to demo users.
 * Communicates read-only mode and offers sign-up CTA.
 */

import { useTranslations } from "next-intl";
import { useDemoMode } from "@/lib/demo/demo-context";

export function DemoBanner() {
  const { isDemoUser } = useDemoMode();
  const t = useTranslations("demo");

  if (!isDemoUser) return null;

  return (
    <div
      role="status"
      className="bg-yellow-900/60 border-b border-yellow-700/50 px-4 py-2 text-center text-sm text-yellow-200"
    >
      <span>{t("banner")}</span>
      {" "}
      <a
        href="/en/auth/register"
        className="underline font-medium hover:text-yellow-100"
      >
        {t("signUp")}
      </a>
    </div>
  );
}
