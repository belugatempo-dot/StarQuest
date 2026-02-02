"use client";

import { useState } from "react";

interface InviteParentCardProps {
  familyId: string;
  locale: string;
}

export default function InviteParentCard({ familyId, locale }: InviteParentCardProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isZh = locale === "zh-CN";

  const sendInvitation = async () => {
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(isZh ? "请输入邮箱地址" : "Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(isZh ? "请输入有效的邮箱地址" : "Please enter a valid email address");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/invite-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, email: trimmedEmail, locale }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || (isZh ? "发送邀请失败" : "Failed to send invitation"));
      }

      setSentTo(trimmedEmail);
      setEmail("");
    } catch (err: any) {
      setError(err.message || (isZh ? "发送邀请失败" : "Failed to send invitation"));
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSentTo(null);
    setEmail("");
    setError("");
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">
          {isZh ? "邀请家长" : "Invite Parent"}
        </h3>
        <span className="text-3xl">👥</span>
      </div>

      {sentTo ? (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-700 font-medium">
              {isZh ? `邀请已发送至 ${sentTo}` : `Invitation sent to ${sentTo}`}
            </p>
            <p className="text-green-600 text-sm mt-1">
              {isZh ? "邀请码7天内有效" : "The invitation expires in 7 days"}
            </p>
          </div>
          <button
            onClick={resetForm}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            {isZh ? "发送另一个邀请" : "Send Another"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {isZh
              ? "输入配偶或家庭成员的邮箱地址，系统将发送包含邀请码的邮件"
              : "Enter your spouse or family member's email to send them an invitation with a registration link"}
          </p>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder={isZh ? "输入邮箱地址" : "Enter email address"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
              disabled={isSending}
            />
          </div>
          <button
            onClick={sendInvitation}
            disabled={isSending}
            className="w-full bg-secondary text-white py-2 px-4 rounded-lg font-semibold hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending
              ? (isZh ? "发送中..." : "Sending...")
              : (isZh ? "发送邀请" : "Send Invitation")}
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
