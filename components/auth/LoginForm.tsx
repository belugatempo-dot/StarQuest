"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { trackDemoLogin } from "@/lib/analytics/events";
import ResendVerificationButton from "@/components/auth/ResendVerificationButton";
import { DEMO_USERS, type DemoRole } from "@/lib/demo/demo-users";
import { useLoginForm } from "@/lib/hooks/useLoginForm";

// ---- DemoRolePicker (local sub-component) ----

function DemoRolePicker({ locale }: { locale: string }) {
  const t = useTranslations();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async (role: DemoRole) => {
    setLoadingRole(role);
    setError(null);

    try {
      // 1. Get one-time token from server
      const res = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Demo login failed");
      }

      const { token_hash } = await res.json();

      // 2. Verify OTP to establish browser session
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      // 3. Track analytics before hard navigation destroys JS context
      const userInfo = DEMO_USERS.find((u) => u.role === role)!;
      trackDemoLogin(role, locale);

      // 4. Hard navigate (CRITICAL: window.location.href, not router.push)
      window.location.href = `/${locale}/${userInfo.redirectPath}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed");
      setLoadingRole(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Demo banner */}
      <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded text-sm">
        <p className="font-medium">{t("demo.pickRole")}</p>
        <p className="text-xs text-slate-400 mt-1">{t("demo.pickRoleHint")}</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Role cards */}
      <div className="space-y-3">
        {DEMO_USERS.map((user) => (
          <button
            key={user.role}
            type="button"
            onClick={() => handleDemoLogin(user.role)}
            disabled={loadingRole !== null}
            className="w-full flex items-center gap-4 p-4 border border-white/20 rounded-lg
              hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <span className="text-3xl">{user.emoji}</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-200">
                {locale === "zh-CN" ? user.nameZh : user.nameEn}
              </p>
              <p className="text-xs text-slate-400">
                {locale === "zh-CN" ? user.descriptionZh : user.descriptionEn}
              </p>
            </div>
            {loadingRole === user.role && (
              <span className="text-sm text-slate-400">{t("common.loading")}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- LoginForm (main component) ----

export default function LoginForm() {
  const t = useTranslations();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1];
  const isDemo = searchParams.get("demo") === "true";

  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    showResendButton,
    showRegistrationLink,
    handleLogin,
  } = useLoginForm(locale);

  if (isDemo) {
    return <DemoRolePicker locale={locale} />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleLogin();
      }}
      className="space-y-4"
    >
      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded">
          {error}
          {showRegistrationLink && (
            <div className="mt-2 text-sm">
              <Link
                href={`/${locale}/register`}
                className="text-primary hover:underline font-medium"
              >
                {t("auth.completeRegistration")}
              </Link>
            </div>
          )}
          {showResendButton && (
            <div className="mt-3">
              <ResendVerificationButton email={email} locale={locale} />
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
          {t("auth.email")}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-white/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
          {t("auth.password")}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 border border-white/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-gray-900 py-2 px-4 rounded-full font-bold hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(255,215,0,0.4)] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("common.loading") : t("common.login")}
      </button>
    </form>
  );
}
