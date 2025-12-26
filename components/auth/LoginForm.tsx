"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import ResendVerificationButton from "@/components/auth/ResendVerificationButton";

export default function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Check if error is due to unverified email
      if (signInError.message.includes("Email not confirmed")) {
        setError(
          locale === "zh-CN"
            ? "您的邮箱尚未验证。请查收验证邮件。"
            : "Your email is not verified. Please check your inbox."
        );
        setShowResendButton(true);
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      console.log("✅ Login successful, user ID:", data.user.id);

      // Fetch user role to determine redirect
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, family_id")
        .eq("id", data.user.id)
        .maybeSingle();

      console.log("📊 User data:", userData);
      console.log("❌ User error:", userError);

      if (userError) {
        const message = locale === "zh-CN"
          ? "找不到用户记录。您的注册可能未完成。"
          : "User record not found. Your registration may not have completed.";
        setError(message);
        setLoading(false);
        return;
      }

      if (!(userData as any)?.family_id) {
        // User exists but has no family - shouldn't happen but handle it
        setError("Please complete family setup.");
        setLoading(false);
        return;
      }

      // Use window.location for hard navigation to ensure cookies are set
      // This forces a full page reload which properly establishes the session
      const redirectPath = (userData as any)?.role === "parent"
        ? `/${locale}/admin`
        : `/${locale}/app`;

      console.log("🔄 Redirecting to:", redirectPath);
      window.location.href = redirectPath;

      // Keep loading state to prevent UI flicker during redirect
      return;
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded">
          {error}
          {(error.includes("User record not found") || error.includes("找不到用户记录")) && (
            <div className="mt-2 text-sm">
              <Link
                href={`/${locale}/register`}
                className="text-secondary hover:underline font-medium"
              >
                {locale === "zh-CN" ? "重新完成注册 →" : "Complete registration →"}
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
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.email")}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.password")}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-secondary text-white py-2 px-4 rounded-lg font-semibold hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("common.loading") : t("common.login")}
      </button>
    </form>
  );
}
