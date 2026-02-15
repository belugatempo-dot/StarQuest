"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { typedInsert } from "@/lib/supabase/helpers";
import ModalFrame from "@/components/ui/ModalFrame";

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
      const { error: insertError } = await typedInsert(supabase, "users", {
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
    <ModalFrame
      title={t("family.addChild")}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t("family.childName")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 dark-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t("family.childNamePlaceholder")}
            required
          />
        </div>

        {/* Email Field (Optional) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t("family.childEmail")} <span className="text-slate-500">({t("common.optional")})</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 dark-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t("family.childEmailPlaceholder")}
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("family.emailOptionalHint")}
          </p>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t("family.password")} <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 px-3 py-2 dark-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("family.passwordPlaceholder")}
              required
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

        {/* Generated Password Display */}
        {generatedPassword && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-sm font-medium text-green-300 mb-1">
              {t("family.generatedPassword")}:
            </p>
            <p className="text-lg font-mono text-green-300">{generatedPassword}</p>
            <p className="text-xs text-green-400 mt-2">
              {t("family.savePassword")}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

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
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? t("common.creating") : t("family.createChild")}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
