"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/auth";

interface EditChildModalProps {
  child: User;
  locale: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditChildModal({
  child,
  locale,
  onClose,
  onSuccess,
}: EditChildModalProps) {
  const t = useTranslations();
  const supabase = createClient();

  const [name, setName] = useState(child.name);
  const [email, setEmail] = useState(child.email || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("family.nameRequired"));
      return;
    }

    setIsLoading(true);

    try {
      // Update users table
      const { error: updateError } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          email: email.trim() || null,
        })
        .eq("id", child.id);

      if (updateError) throw updateError;

      // Note: Updating auth.users email requires admin API
      // For now we only update the users table
      // If you need to update auth email, you'll need a server function

      onSuccess();
    } catch (err: any) {
      console.error("Error updating child:", err);
      setError(err.message || t("family.updateChildError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          {t("family.editChild")}
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

          {/* Email Field */}
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
          </div>

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
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
