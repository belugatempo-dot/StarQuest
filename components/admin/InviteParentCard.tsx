"use client";

import { useState } from "react";

interface InviteParentCardProps {
  familyId: string;
  locale: string;
}

interface InviteResult {
  inviteCode: string;
  emailSent: boolean;
  email?: string;
}

export default function InviteParentCard({ familyId, locale }: InviteParentCardProps) {
  const [email, setEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isZh = locale === "zh-CN";

  const getRegistrationUrl = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${locale}/register?invite=${code}`;
  };

  const getShareMessage = (code: string) => {
    const url = getRegistrationUrl(code);
    if (isZh) {
      return `你被邀请加入StarQuest家庭！使用此链接注册：${url}\n\n或手动输入邀请码：${code}`;
    }
    return `You're invited to join a StarQuest family! Register here: ${url}\n\nOr enter invite code: ${code}`;
  };

  const createInvitation = async () => {
    setError("");

    const trimmedEmail = email.trim();

    // If email is provided, validate it
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError(isZh ? "请输入有效的邮箱地址" : "Please enter a valid email address");
        return;
      }
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/invite-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId,
          ...(trimmedEmail && { email: trimmedEmail }),
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || (isZh ? "创建邀请失败" : "Failed to create invitation"));
      }

      setResult({
        inviteCode: data.inviteCode,
        emailSent: data.emailSent,
        email: trimmedEmail || undefined,
      });
      setEmail("");
    } catch (err: any) {
      setError(err.message || (isZh ? "创建邀请失败" : "Failed to create invitation"));
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(getRegistrationUrl(result.inviteCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  const shareWhatsApp = () => {
    if (!result) return;
    const text = encodeURIComponent(getShareMessage(result.inviteCode));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    if (!result) return;
    const subject = encodeURIComponent(
      isZh ? "加入我的StarQuest家庭" : "Join my StarQuest family"
    );
    const body = encodeURIComponent(getShareMessage(result.inviteCode));
    const mailto = result.email
      ? `mailto:${result.email}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
  };

  const resetForm = () => {
    setResult(null);
    setEmail("");
    setError("");
    setCopied(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">
          {isZh ? "邀请家长" : "Invite Parent"}
        </h3>
        <span className="text-3xl">👥</span>
      </div>

      {result ? (
        <>
          {/* Invite code display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-700 font-medium mb-1">
              {isZh ? "邀请已创建！" : "Invitation created!"}
            </p>
            <p className="text-green-600 text-sm mb-3">
              {isZh ? "邀请码7天内有效" : "The invitation expires in 7 days"}
            </p>
            <div className="bg-white rounded-md p-3 text-center border border-green-100">
              <p className="text-xs text-gray-500 mb-1">
                {isZh ? "邀请码" : "Invite Code"}
              </p>
              <p className="text-2xl font-mono font-bold tracking-widest text-gray-800">
                {result.inviteCode}
              </p>
            </div>
          </div>

          {/* Email sent note */}
          {result.emailSent && result.email && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
              {isZh
                ? `邮件已发送至 ${result.email}`
                : `Email also sent to ${result.email}`}
            </div>
          )}

          {/* Share buttons */}
          <div className="space-y-2 mb-4">
            <button
              onClick={copyLink}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
            >
              {copied
                ? (isZh ? "已复制!" : "Copied!")
                : (isZh ? "复制链接" : "Copy Link")}
            </button>
            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-green-100 text-green-700 py-2 px-4 rounded-lg font-medium hover:bg-green-200 transition text-sm"
            >
              WhatsApp
            </button>
            <button
              onClick={shareEmail}
              className="w-full flex items-center justify-center gap-2 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg font-medium hover:bg-blue-200 transition text-sm"
            >
              {isZh ? "通过邮件分享" : "Share via Email"}
            </button>
          </div>

          {/* Create another */}
          <button
            onClick={resetForm}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            {isZh ? "创建另一个邀请" : "Create Another"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {isZh
              ? "创建邀请码，通过链接或消息分享给家庭成员"
              : "Create an invite code to share with your spouse or family member via link or message"}
          </p>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder={isZh ? "邮箱地址（可选）" : "Email address (optional)"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
              disabled={isCreating}
            />
          </div>
          <button
            onClick={createInvitation}
            disabled={isCreating}
            className="w-full bg-secondary text-white py-2 px-4 rounded-lg font-semibold hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating
              ? (isZh ? "创建中..." : "Creating...")
              : (isZh ? "创建邀请" : "Create Invitation")}
          </button>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
