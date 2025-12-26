"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface InviteParentCardProps {
  familyId: string;
  locale: string;
}

export default function InviteParentCard({ familyId, locale }: InviteParentCardProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  const generateInviteCode = async () => {
    setIsGenerating(true);
    setError("");
    setCopied(false);

    try {
      const { data, error: generateError } = await (supabase.rpc as any)("create_family_invite", {
        p_family_id: familyId,
      });

      if (generateError) throw generateError;

      setInviteCode(data);
    } catch (err: any) {
      console.error("❌ Failed to generate invite code:", err);
      setError(err.message || (locale === "zh-CN" ? "生成邀请码失败" : "Failed to generate invite code"));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteCode) return;

    const inviteUrl = `${window.location.origin}/${locale}/register?invite=${inviteCode}`;
    const message =
      locale === "zh-CN"
        ? `加入我们的家庭！\n\n访问 ${inviteUrl}\n或在注册时输入邀请码：${inviteCode}\n\n(邀请码7天内有效)`
        : `Join our family!\n\nVisit ${inviteUrl}\nOr enter invite code during registration: ${inviteCode}\n\n(Code valid for 7 days)`;

    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">
          {locale === "zh-CN" ? "邀请家长" : "Invite Parent"}
        </h3>
        <span className="text-3xl">👥</span>
      </div>

      {!inviteCode ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {locale === "zh-CN"
              ? "邀请配偶或家庭成员成为第二家长，共同管理孩子的任务和奖励"
              : "Invite your spouse or family member to become a second parent and co-manage children's quests and rewards"}
          </p>
          <button
            onClick={generateInviteCode}
            disabled={isGenerating}
            className="w-full bg-secondary text-white py-2 px-4 rounded-lg font-semibold hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? (locale === "zh-CN" ? "生成中..." : "Generating...")
              : (locale === "zh-CN" ? "生成邀请码" : "Generate Invite Code")}
          </button>
        </>
      ) : (
        <>
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">
              {locale === "zh-CN" ? "邀请码（7天内有效）：" : "Invite Code (valid for 7 days):"}
            </p>
            <div className="flex items-center justify-between">
              <code className="text-2xl font-bold font-mono tracking-widest text-secondary">
                {inviteCode}
              </code>
              <button
                onClick={copyToClipboard}
                className="ml-4 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                {copied
                  ? (locale === "zh-CN" ? "✓ 已复制" : "✓ Copied")
                  : (locale === "zh-CN" ? "复制" : "Copy")}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            {locale === "zh-CN"
              ? "分享此邀请码给您的配偶或家庭成员。他们在注册时输入此邀请码即可加入您的家庭成为家长。"
              : "Share this invite code with your spouse or family member. They can enter it during registration to join your family as a parent."}
          </p>

          <button
            onClick={() => {
              setInviteCode(null);
              setError("");
            }}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            {locale === "zh-CN" ? "生成新邀请码" : "Generate New Code"}
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
