"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ModalFrame from "@/components/ui/ModalFrame";
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
      // Use API route to update child (handles both users table and auth.users)
      const response = await fetch(`/${locale}/api/admin/update-child`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId: child.id,
          name: name.trim(),
          email: email.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("family.updateChildError"));
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error updating child:", err);
      setError(err.message || t("family.updateChildError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalFrame
      title={t("family.editChild")}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
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
    </ModalFrame>
  );
}
