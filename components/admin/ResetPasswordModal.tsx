"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ModalFrame from "@/components/ui/ModalFrame";
import type { User } from "@/lib/auth";

interface ResetPasswordModalProps {
  child: User;
  locale: string;
  onClose: () => void;
}

export default function ResetPasswordModal({
  child,
  locale,
  onClose,
}: ResetPasswordModalProps) {
  const t = useTranslations();

  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Generate a simple password
  const generatePassword = () => {
    const adjectives = ["Happy", "Sunny", "Bright", "Lucky", "Swift", "Smart", "Bold", "Kind"];
    const nouns = ["Star", "Moon", "Cloud", "Tiger", "Dragon", "Lion", "Eagle", "Bear"];
    const number = Math.floor(Math.random() * 1000);
    const pwd = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
      nouns[Math.floor(Math.random() * nouns.length)]
    }${number}`;
    setNewPassword(pwd);
    setSuccess(false);
  };

  const handleResetPassword = async () => {
    setError("");
    setSuccess(false);

    if (!newPassword || newPassword.length < 6) {
      setError(t("family.passwordMinLength"));
      return;
    }

    setIsLoading(true);

    try {
      // Call API route to reset password (admin operation)
      const response = await fetch(`/${locale}/api/admin/reset-child-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: child.id,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Error resetting password:", err);
      setError(err.message || t("family.resetPasswordError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalFrame
      title={t("family.resetPassword")}
      onClose={onClose}
    >
      <div className="px-6 pb-6">
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <p className="text-sm text-slate-400">
            {t("family.resetPasswordFor")}: <span className="font-semibold">{child.name}</span>
          </p>
        </div>

        {!success ? (
          <div className="space-y-4">
            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t("family.newPassword")} <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 px-3 py-2 dark-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t("family.newPasswordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/30 transition text-sm whitespace-nowrap"
                >
                  {t("family.generate")}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t("family.passwordHint")}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-sm text-yellow-300">
                ⚠️ {t("family.resetPasswordWarning")}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:bg-white/10 rounded-lg transition"
                disabled={isLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                disabled={isLoading || !newPassword}
              >
                {isLoading ? t("common.resetting") : t("family.resetPasswordButton")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success Message */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-300 font-medium mb-2">
                ✅ {t("family.passwordResetSuccess")}
              </p>
              <div className="bg-white/5 border border-green-500/30 rounded p-3 mt-2">
                <p className="text-sm text-slate-400 mb-1">{t("family.newPassword")}:</p>
                <p className="text-2xl font-mono text-green-300 font-bold">{newPassword}</p>
              </div>
              <p className="text-sm text-green-400 mt-3">
                {t("family.writeDownPassword")}
              </p>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
