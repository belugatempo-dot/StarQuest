"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import ModalFrame from "@/components/ui/ModalFrame";
import { getAvailablePeriods, getReportFilename, type PeriodType } from "@/lib/reports/date-ranges";

interface GenerateReportModalProps {
  locale: string;
  onClose: () => void;
}

const PERIOD_TYPES: PeriodType[] = ["daily", "weekly", "monthly", "quarterly", "yearly"];

export default function GenerateReportModal({ locale, onClose }: GenerateReportModalProps) {
  const t = useTranslations();
  const [periodType, setPeriodType] = useState<PeriodType>("weekly");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periods = useMemo(
    () => getAvailablePeriods(periodType, locale),
    [periodType, locale]
  );

  const selectedPeriod = periods[selectedIndex] ?? periods[0];

  const filename = selectedPeriod
    ? getReportFilename(periodType, selectedPeriod.start, selectedPeriod.end)
    : "";

  function handlePeriodTypeChange(pt: PeriodType) {
    setPeriodType(pt);
    setSelectedIndex(0);
    setError(null);
  }

  async function handleDownload() {
    if (!selectedPeriod) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports/generate-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodType,
          periodStart: selectedPeriod.start.toISOString(),
          periodEnd: selectedPeriod.end.toISOString(),
          locale,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("reports.downloadError"));
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("reports.downloadError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalFrame
      title={t("reports.generateReport")}
      onClose={onClose}
      error={error}
      footer={
        <button
          onClick={handleDownload}
          disabled={loading || !selectedPeriod}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? t("reports.generating") : t("reports.download")}
        </button>
      }
    >
      <div className="px-6 pb-4 space-y-4">
        {/* Period Type Selector */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            {t("reports.periodType")}
          </label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_TYPES.map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => handlePeriodTypeChange(pt)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  periodType === pt
                    ? "bg-indigo-600 text-white"
                    : "bg-white/10 text-slate-300 hover:bg-white/20"
                }`}
              >
                {t(`reports.${pt}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Selector */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            {t("reports.dateRange")}
          </label>
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
          >
            {periods.map((p, i) => (
              <option key={i} value={i} className="bg-slate-800">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filename Preview */}
        {filename && (
          <div className="text-xs text-slate-400">
            {t("reports.filename")}: <span className="font-mono text-slate-300">{filename}</span>
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
