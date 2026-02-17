"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import GenerateReportModal from "@/components/admin/GenerateReportModal";

interface ActivityPageHeaderProps {
  locale: string;
}

export default function ActivityPageHeader({ locale }: ActivityPageHeaderProps) {
  const t = useTranslations();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="night-header rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white star-glow">
              ✨ {locale === "zh-CN" ? "星星日历" : "Star Calendar"}
            </h1>
            <p className="text-white/80">
              {locale === "zh-CN"
                ? "查看所有记录的星星活动，按日期和类型筛选"
                : "View all recorded star activities, filter by date and type"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer text-sm font-medium"
          >
            📄 {t("reports.generateReport")}
          </button>
        </div>
      </div>

      {showModal && (
        <GenerateReportModal locale={locale} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
