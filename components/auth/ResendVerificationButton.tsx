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
        className="w-full bg-secondary text-white py-2 px-4 rounded-lg font-semibold hover:bg-secondary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
