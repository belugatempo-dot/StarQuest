"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const currentLocale = pathname.split("/")[1] as Locale;

  const switchLanguage = (newLocale: Locale) => {
    // Replace the locale in the pathname
    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  return (
    <div className="flex gap-2 items-center">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLanguage(locale)}
          className={`px-3 py-1 rounded transition ${
            currentLocale === locale
              ? "bg-primary text-gray-900 font-semibold"
              : "bg-white/10 text-slate-400 hover:bg-white/20"
          }`}
        >
          {locale === "en" ? "EN" : "中文"}
        </button>
      ))}
    </div>
  );
}
