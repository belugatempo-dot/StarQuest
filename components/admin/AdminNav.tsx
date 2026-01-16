"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import type { User } from "@/lib/auth";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminNav({ user, locale }: { user: User; locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  };

  const navItems = [
    { path: `/${locale}/admin`, label: t("admin.title"), icon: "🏠" },
    { path: `/${locale}/admin/record`, label: t("admin.recordStars"), icon: "⭐" },
    { path: `/${locale}/admin/activity`, label: t("admin.activityLog"), icon: "📊" },
    { path: `/${locale}/admin/approve`, label: t("admin.approvalCenter"), icon: "✅" },
    { path: `/${locale}/admin/quests`, label: t("admin.manageQuests"), icon: "📋" },
    { path: `/${locale}/admin/rewards`, label: t("admin.manageRewards"), icon: "🎁" },
    { path: `/${locale}/admin/levels`, label: t("admin.manageLevels"), icon: "🏆" },
    { path: `/${locale}/admin/family`, label: t("admin.familyManagement"), icon: "👥" },
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}/admin`} className="flex items-center space-x-2">
            <span className="text-2xl">⭐</span>
            <div>
              <span className="text-xl font-bold text-primary">{t("brand.name")}</span>
              <span className="ml-2 text-xs bg-secondary text-white px-2 py-1 rounded">
                {t("admin.parentLabel")}
              </span>
            </div>
          </Link>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">👋 {user.name}</span>
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex overflow-x-auto space-x-2 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm transition ${
                isActive(item.path)
                  ? "bg-secondary text-white font-semibold"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
