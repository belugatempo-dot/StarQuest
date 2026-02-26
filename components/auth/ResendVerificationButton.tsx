"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

export default function ResendVerificationButton({
  email,
  locale,
}: {
  email: string;
  locale: string;
}) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });

    if (!error) {
      setMessage({
        type: "success",
        text: locale === "zh-CN" ? "验证邮件已发送！请查收。" : "Verification email sent! Check your inbox.",
      });
      setCooldown(60);
    } else {
      setMessage({
        type: "error",
        text: locale === "zh-CN" ? "发送失败，请重试。" : "Failed to send email. Please try again.",
      });
    }

    setLoading(false);
  };

  return (
    <div>
      <button
        onClick={handleResend}
        disabled={loading || cooldown > 0}
        className="w-full bg-primary text-gray-900 py-2 px-4 rounded-full font-bold hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(255,215,0,0.4)] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? locale === "zh-CN" ? "发送中..." : "Sending..."
          : cooldown > 0
          ? `${locale === "zh-CN" ? "请等待" : "Wait"} ${cooldown}${locale === "zh-CN" ? "秒" : "s"}`
          : locale === "zh-CN" ? "重新发送验证邮件" : "Resend Verification Email"}
      </button>

      {message && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-300"
              : "bg-red-500/10 border border-red-500/30 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
