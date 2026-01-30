"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate } from "@/lib/supabase/helpers";
import ModalFrame from "@/components/ui/ModalFrame";
import type { User } from "@/lib/auth";

interface EditParentModalProps {
  parent: User;
  locale: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditParentModal({
  parent,
  locale,
  onClose,
  onSuccess,
}: EditParentModalProps) {
  const t = useTranslations();
  const supabase = createClient();

  const [name, setName] = useState(parent.name);
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
      const { error: updateError } = await typedUpdate(supabase, "users", {
          name: name.trim(),
        })
        .eq("id", parent.id);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err: any) {
      console.error("Error updating parent:", err);
      setError(err.message || t("family.updateParentError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalFrame
      title={t("family.editParent")}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("family.parentName")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t("family.parentNamePlaceholder")}
            required
          />
        </div>

        {/* Email Display (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.email")}
          </label>
          <input
            type="email"
            value={parent.email || ""}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">
            {t("family.emailCannotChange")}
          </p>
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
    </ModalFrame>
  );
}
