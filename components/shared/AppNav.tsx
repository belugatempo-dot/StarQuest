"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import type { User } from "@/lib/auth";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import SettingsDrawer from "@/components/admin/SettingsDrawer";

export default function AppNav({ user, locale }: { user: User; locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isParent = user.role === "parent";

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  };

  const navItems = [
    { path: `/${locale}/dashboard`, label: t("dashboard.title"), icon: "🏠" },
    { path: `/${locale}/quests`, label: t("common.quests"), icon: "📋" },
    { path: `/${locale}/rewards`, label: t("common.rewards"), icon: "🎁" },
    { path: `/${locale}/activities`, label: t("common.activities"), icon: "📊" },
    { path: `/${locale}/profile`, label: t("common.profile"), icon: "👤" },
  ];

  return (
    <nav className="bg-surface border-b border-white/10">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}/dashboard`} className="flex items-center space-x-2">
            <span className="text-2xl">⭐</span>
            <div>
              <span className="text-2xl font-bold text-primary">{t("brand.name")}</span>
              {isParent && (
                <span className="ml-2 text-xs bg-secondary text-white px-2 py-1 rounded">
                  {t("admin.parentLabel")}
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg transition ${
                  isActive(item.path)
                    ? "bg-primary text-gray-900 font-semibold"
                    : "text-slate-400 hover:bg-white/10"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">👋 {user.name}</span>
            <LanguageSwitcher />
            {isParent && (
              <SettingsDrawer
                familyId={user.family_id || ""}
                parentEmail={user.email || ""}
                locale={locale}
              />
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mt-4 flex overflow-x-auto space-x-2 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm transition ${
                isActive(item.path)
                  ? "bg-primary text-gray-900 font-semibold"
                  : "bg-white/5 text-slate-400"
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
