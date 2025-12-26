"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function RegisterForm() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1] as "en" | "zh-CN";

  // ALL registration data collected in ONE form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [parentName, setParentName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [validatedFamily, setValidatedFamily] = useState<{ name: string; id: string } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Check URL parameter for invite code on mount
  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    if (inviteParam) {
      handleInviteCodeChange(inviteParam);
    }
  }, [searchParams]);

  // Validate invite code when user types it
  const handleInviteCodeChange = async (code: string) => {
    setInviteCode(code.toUpperCase());
    setValidatedFamily(null);
    setError("");

    if (code.trim().length === 0) {
      return;
    }

    if (code.trim().length !== 8) {
      setError(locale === "zh-CN" ? "邀请码应为8位" : "Invite code should be 8 characters");
      return;
    }

    setIsValidating(true);
    try {
      const { data, error: validateError } = await supabase.rpc("validate_invite_code", {
        p_invite_code: code.toUpperCase(),
      });

      if (validateError) throw validateError;

      if (data && data.length > 0 && data[0].is_valid) {
        setValidatedFamily({ name: data[0].family_name, id: data[0].family_id });
        setError("");
      } else {
        setError(locale === "zh-CN" ? "邀请码无效或已过期" : "Invalid or expired invite code");
      }
    } catch (err: any) {
      console.error("❌ Invite validation error:", err);
      setError(locale === "zh-CN" ? "验证邀请码失败" : "Failed to validate invite code");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const isJoiningFamily = inviteCode.trim().length > 0;

    // Validation
    if (password !== confirmPassword) {
      setError(locale === "zh-CN" ? "密码不匹配" : "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError(locale === "zh-CN" ? "密码至少需要6个字符" : "Password must be at least 6 characters");
      return;
    }

    if (!parentName.trim()) {
      setError(locale === "zh-CN" ? "请输入您的名字" : "Please enter your name");
      return;
    }

    // If NOT joining via invite, require family name
    if (!isJoiningFamily && !familyName.trim()) {
      setError(locale === "zh-CN" ? "请输入家庭名称" : "Please enter family name");
      return;
    }

    // If joining via invite, ensure it's validated
    if (isJoiningFamily && !validatedFamily) {
      setError(locale === "zh-CN" ? "请输入有效的邀请码" : "Please enter a valid invite code");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create Supabase Auth user
      console.log("🔐 Creating auth user...");
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${locale}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("No user returned from signup");

      console.log("✅ Auth user created:", authData.user.id);

      if (isJoiningFamily) {
        // Step 2a: Join existing family with invite code
        console.log("👨‍👩‍👧 Joining family via invite code...");
        const { data: familyId, error: joinError } = await supabase.rpc(
          "join_family_with_invite",
          {
            p_invite_code: inviteCode,
            p_user_id: authData.user.id,
            p_user_name: parentName,
            p_user_email: email,
            p_user_locale: locale,
          }
        );

        if (joinError) {
          console.error("❌ Join family error:", joinError);
          // Note: Cannot delete auth user from frontend (requires service_role key).
          // The database function will heal orphaned records automatically on retry.
          throw joinError;
        }

        console.log("✅ Joined family:", familyId);
      } else {
        // Step 2b: Create new family
        console.log("👨‍👩‍👧 Creating family and user record...");
        const { data: familyId, error: familyError } = await supabase.rpc(
          "create_family_with_templates",
          {
            p_family_name: familyName,
            p_user_id: authData.user.id,
            p_user_name: parentName,
            p_user_email: email,
            p_user_locale: locale,
          }
        );

        if (familyError) {
          console.error("❌ Family creation error:", familyError);
          // Note: Cannot delete auth user from frontend (requires service_role key).
          // The database function will heal orphaned records automatically on retry.
          throw familyError;
        }

        console.log("✅ Family created:", familyId);
      }

      console.log("🔄 Redirecting to verify email page...");

      // Success! Redirect to verify-email page
      window.location.href = `/${locale}/auth/verify-email?email=${encodeURIComponent(email)}`;
    } catch (err: any) {
      console.error("❌ Registration error:", err);

      // Provide user-friendly error messages
      let userMessage = "";

      if (err.message.includes("duplicate key") || err.message.includes("already registered")) {
        userMessage = locale === "zh-CN"
          ? "此邮箱已被注册。如果是您之前注册失败，请直接尝试登录，或稍后重试注册。"
          : "This email is already registered. If this was a previous failed attempt, try logging in or retry registration in a moment.";
      } else if (err.message.includes("Email") && err.message.includes("different account")) {
        userMessage = locale === "zh-CN"
          ? "此邮箱已被其他账号使用。请使用其他邮箱或尝试登录。"
          : "This email belongs to a different account. Please use a different email or try logging in.";
      } else {
        userMessage = err.message || (locale === "zh-CN"
          ? "注册失败。请稍后重试。如果问题持续，请联系支持。"
          : "Registration failed. Please try again in a moment. If the issue persists, contact support.");
      }

      setError(userMessage);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {locale === "zh-CN" ? "邮箱" : "Email"}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          placeholder={locale === "zh-CN" ? "your@email.com" : "you@example.com"}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          {locale === "zh-CN" ? "密码" : "Password"}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          placeholder={locale === "zh-CN" ? "至少6个字符" : "At least 6 characters"}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          {locale === "zh-CN" ? "确认密码" : "Confirm Password"}
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          placeholder={locale === "zh-CN" ? "再次输入密码" : "Re-enter your password"}
          disabled={isLoading}
        />
      </div>

      {/* Only show Family Name if NOT using invite code */}
      {!validatedFamily && (
        <div>
          <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-1">
            {locale === "zh-CN" ? "家庭名称" : "Family Name"}
          </label>
          <input
            id="familyName"
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            required={!validatedFamily}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            placeholder={locale === "zh-CN" ? "张家" : "Smith Family"}
            disabled={isLoading}
          />
        </div>
      )}

      <div>
        <label htmlFor="parentName" className="block text-sm font-medium text-gray-700 mb-1">
          {locale === "zh-CN" ? "您的名字（家长）" : "Your Name (Parent)"}
        </label>
        <input
          id="parentName"
          type="text"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          placeholder={locale === "zh-CN" ? "张三" : "John Smith"}
          disabled={isLoading}
        />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[#FFFDF7] text-gray-500">
            {locale === "zh-CN" ? "或" : "OR"}
          </span>
        </div>
      </div>

      {/* Invite Code Section */}
      {validatedFamily && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {locale === "zh-CN" ? "✓ 将加入家庭：" : "✓ Joining family: "}<strong>{validatedFamily.name}</strong>
        </div>
      )}

      <div>
        <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
          {locale === "zh-CN" ? "邀请码（可选）" : "Invite Code (Optional)"}
        </label>
        <input
          id="inviteCode"
          type="text"
          value={inviteCode}
          onChange={(e) => handleInviteCodeChange(e.target.value)}
          maxLength={8}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent uppercase font-mono tracking-wider"
          placeholder={locale === "zh-CN" ? "如有邀请码请输入" : "Enter if you have one"}
          disabled={isLoading || isValidating}
        />
        <p className="mt-1 text-xs text-gray-500">
          {locale === "zh-CN"
            ? "有邀请码？输入后可加入现有家庭成为第二家长"
            : "Have an invite code? Enter to join an existing family as a second parent"}
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-secondary text-white py-2 px-4 rounded-lg font-semibold hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading
          ? (locale === "zh-CN" ? "注册中..." : "Creating account...")
          : (locale === "zh-CN" ? "注册" : "Register")}
      </button>

      <div className="text-center text-sm text-gray-600">
        {locale === "zh-CN" ? "已有账户？" : "Already have an account?"}{" "}
        <a href={`/${locale}/login`} className="text-secondary font-semibold hover:underline">
          {locale === "zh-CN" ? "登录" : "Sign in"}
        </a>
      </div>
    </form>
  );
}
