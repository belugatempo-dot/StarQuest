"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type ReportPreferences = {
  id: string;
  family_id: string;
  report_email: string | null;
  weekly_report_enabled: boolean;
  monthly_report_enabled: boolean;
  settlement_email_enabled: boolean;
  timezone: string;
  report_locale: string;
  created_at: string;
  updated_at: string;
};

interface ReportPreferencesFormProps {
  familyId: string;
  preferences: ReportPreferences | null;
  parentEmail: string;
  locale: string;
}

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export default function ReportPreferencesForm({
  familyId,
  preferences,
  parentEmail,
  locale,
}: ReportPreferencesFormProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [reportEmail, setReportEmail] = useState(preferences?.report_email || "");
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(
    preferences?.weekly_report_enabled ?? true
  );
  const [monthlyReportEnabled, setMonthlyReportEnabled] = useState(
    preferences?.monthly_report_enabled ?? true
  );
  const [settlementEmailEnabled, setSettlementEmailEnabled] = useState(
    preferences?.settlement_email_enabled ?? true
  );
  const [timezone, setTimezone] = useState(preferences?.timezone || "UTC");
  const [reportLocale, setReportLocale] = useState<"en" | "zh-CN">(
    (preferences?.report_locale as "en" | "zh-CN") || (locale === "zh-CN" ? "zh-CN" : "en")
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch(`/${locale}/api/admin/update-report-preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId,
          reportEmail: reportEmail.trim() || null,
          weeklyReportEnabled,
          monthlyReportEnabled,
          settlementEmailEnabled,
          timezone,
          reportLocale,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save");
      }

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error: any) {
      console.error("Failed to save preferences:", error);
      setSaveStatus("error");
      setErrorMessage(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Override */}
      <div>
        <label
          htmlFor="reportEmail"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("emailOverride")}
        </label>
        <input
          type="email"
          id="reportEmail"
          value={reportEmail}
          onChange={(e) => setReportEmail(e.target.value)}
          placeholder={parentEmail || t("emailPlaceholder")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-gray-500">
          {t("emailOverrideHint")}
        </p>
      </div>

      {/* Report Toggles */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">{t("enabledReports")}</h3>

        {/* Weekly Report Toggle */}
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
          <div>
            <span className="font-medium text-gray-900">{t("weeklyReport")}</span>
            <p className="text-sm text-gray-500">{t("weeklyReportDescription")}</p>
          </div>
          <input
            type="checkbox"
            checked={weeklyReportEnabled}
            onChange={(e) => setWeeklyReportEnabled(e.target.checked)}
            className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
        </label>

        {/* Monthly Report Toggle */}
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
          <div>
            <span className="font-medium text-gray-900">{t("monthlyReport")}</span>
            <p className="text-sm text-gray-500">{t("monthlyReportDescription")}</p>
          </div>
          <input
            type="checkbox"
            checked={monthlyReportEnabled}
            onChange={(e) => setMonthlyReportEnabled(e.target.checked)}
            className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
        </label>

        {/* Settlement Email Toggle */}
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
          <div>
            <span className="font-medium text-gray-900">{t("settlementEmail")}</span>
            <p className="text-sm text-gray-500">{t("settlementEmailDescription")}</p>
          </div>
          <input
            type="checkbox"
            checked={settlementEmailEnabled}
            onChange={(e) => setSettlementEmailEnabled(e.target.checked)}
            className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
        </label>
      </div>

      {/* Timezone */}
      <div>
        <label
          htmlFor="timezone"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("timezone")}
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">{t("timezoneHint")}</p>
      </div>

      {/* Report Language */}
      <div>
        <label
          htmlFor="reportLocale"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("reportLanguage")}
        </label>
        <select
          id="reportLocale"
          value={reportLocale}
          onChange={(e) => setReportLocale(e.target.value as "en" | "zh-CN")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="en">English</option>
          <option value="zh-CN">中文</option>
        </select>
      </div>

      {/* Status Messages */}
      {saveStatus === "success" && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{t("saveSuccess")}</p>
        </div>
      )}

      {saveStatus === "error" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-3 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? tc("saving") : tc("save")}
      </button>
    </form>
  );
}
