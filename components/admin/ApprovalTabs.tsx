"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import StarRequestList from "./StarRequestList";
import RedemptionRequestList from "./RedemptionRequestList";

interface ApprovalTabsProps {
  starRequests: any[];
  redemptionRequests: any[];
  locale: string;
  parentId: string;
}

export default function ApprovalTabs({
  starRequests,
  redemptionRequests,
  locale,
  parentId,
}: ApprovalTabsProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<"stars" | "redemptions">("stars");

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("stars")}
          className={`flex-1 px-6 py-4 font-semibold transition ${
            activeTab === "stars"
              ? "bg-secondary text-white border-b-2 border-secondary"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t("admin.starRequests")}
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-warning text-white">
            {starRequests.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("redemptions")}
          className={`flex-1 px-6 py-4 font-semibold transition ${
            activeTab === "redemptions"
              ? "bg-secondary text-white border-b-2 border-secondary"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t("admin.redemptionRequests")}
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-warning text-white">
            {redemptionRequests.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "stars" ? (
          <StarRequestList
            requests={starRequests}
            locale={locale}
            parentId={parentId}
          />
        ) : (
          <RedemptionRequestList
            requests={redemptionRequests}
            locale={locale}
            parentId={parentId}
          />
        )}
      </div>
    </div>
  );
}
