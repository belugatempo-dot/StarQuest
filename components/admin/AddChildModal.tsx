"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface AddChildModalProps {
  familyId: string;
  locale: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddChildModal({
  familyId,
  locale,
  onClose,
  onSuccess,
}: AddChildModalProps) {
  const t = useTranslations();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  // Generate a simple password
  const generatePassword = () => {
    const adjectives = ["Happy", "Sunny", "Bright", "Lucky", "Swift"];
    const nouns = ["Star", "Moon", "Cloud", "Tiger", "Dragon"];
    const number = Math.floor(Math.random() * 100);
    const pwd = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
      nouns[Math.floor(Math.random() * nouns.length)]
    }${number}`;
    setPassword(pwd);
    setGeneratedPassword(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("family.nameRequired"));
      return;
    }

    if (!password || password.length < 6) {
      setError(t("family.passwordMinLength"));
      return;
    }

    setIsLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email || `${name.toLowerCase().replace(/\s+/g, "")}.child@example.com`,
        password: password,
        options: {
          data: {
            name: name,
            role: "child",
            family_id: familyId,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Insert into users table
      const { error: insertError } = await (supabase.from("users").insert as any)({
        id: authData.user.id,
        family_id: familyId,
        name: name,
        role: "child",
        email: email || null,
        locale: locale as "en" | "zh-CN",
      });

      if (insertError) {
        // If users table insert fails, we should delete the auth user
        // But admin API is not available, so we'll just show error
        console.error("Failed to insert user record:", insertError);
        throw new Error(t("family.createUserError"));
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error creating child:", err);
      setError(err.message || t("family.createChildError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          {t("family.addChild")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("family.childName")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("family.childNamePlaceholder")}
              required
            />
          </div>

          {/* Email Field (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("family.childEmail")} <span className="text-gray-400">({t("common.optional")})</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("family.childEmailPlaceholder")}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("family.emailOptionalHint")}
            </p>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("family.password")} <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("family.passwordPlaceholder")}
                required
              />
              <button
                type="button"
                onClick={generatePassword}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-sm whitespace-nowrap"
              >
                {t("family.generate")}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t("family.passwordHint")}
            </p>
          </div>

          {/* Generated Password Display */}
          {generatedPassword && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800 mb-1">
                {t("family.generatedPassword")}:
              </p>
              <p className="text-lg font-mono text-green-900">{generatedPassword}</p>
              <p className="text-xs text-green-600 mt-2">
                {t("family.savePassword")}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              disabled={isLoading}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? t("common.creating") : t("family.createChild")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
