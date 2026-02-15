"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ReportPreferencesForm from "@/components/admin/ReportPreferencesForm";

interface SettingsDrawerProps {
  familyId: string;
  parentEmail: string;
  locale: string;
}

export default function SettingsDrawer({
  familyId,
  parentEmail,
  locale,
}: SettingsDrawerProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  const open = async () => {
    setIsOpen(true);
    if (!hasFetched) {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("family_report_preferences")
        .select("*")
        .eq("family_id", familyId)
        .maybeSingle();
      setPreferences(data);
      setHasFetched(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, close]);

  return (
    <>
      <button
        onClick={open}
        className="text-sm text-gray-600 hover:text-gray-900"
        aria-label={t("admin.settings")}
      >
        ⚙️
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={close}
            data-testid="settings-backdrop"
          />

          {/* Drawer */}
          <div
            className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
            role="dialog"
            aria-label={t("admin.settings")}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{t("settings.title")}</h2>
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-600 mb-6">{t("settings.subtitle")}</p>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("settings.reportPreferences")}
              </h3>
              <p className="text-gray-600 mb-4">
                {t("settings.reportPreferencesDescription")}
              </p>

              {loading ? (
                <div className="flex justify-center py-8" data-testid="settings-loading">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <ReportPreferencesForm
                  familyId={familyId}
                  preferences={preferences}
                  parentEmail={parentEmail}
                  locale={locale}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
