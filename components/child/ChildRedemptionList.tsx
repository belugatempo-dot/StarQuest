"use client";

import { useTranslations } from "next-intl";
import type { Database } from "@/types/database";
import { getRewardName } from "@/lib/localization";
import { formatDateTime } from "@/lib/date-utils";

type Redemption = Database["public"]["Tables"]["redemptions"]["Row"] & {
  rewards: {
    name_en: string;
    name_zh: string | null;
    icon: string | null;
    category: string | null;
  } | null;
};

interface ChildRedemptionListProps {
  redemptions: Redemption[];
  locale: string;
}

export default function ChildRedemptionList({
  redemptions,
  locale,
}: ChildRedemptionListProps) {
  const t = useTranslations();

  if (redemptions.length === 0) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-warning/20 text-warning border border-warning/30">
            <span className="mr-1">⏳</span>
            {t("status.pending")}
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-success/20 text-success border border-success/30">
            <span className="mr-1">✓</span>
            {t("status.approved")}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-danger/20 text-danger border border-danger/30">
            <span className="mr-1">✗</span>
            {t("status.rejected")}
          </span>
        );
      case "fulfilled":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-secondary/20 text-secondary border border-secondary/30">
            <span className="mr-1">🎉</span>
            {t("rewards.fulfilled")}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dark-card rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">📋</span>
        {t("rewards.myRequests")}
      </h2>

      <div className="space-y-3">
        {redemptions.map((redemption) => (
          <div
            key={redemption.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              redemption.status === "pending"
                ? "bg-warning/5 border-warning/20"
                : redemption.status === "approved"
                ? "bg-success/5 border-success/20"
                : redemption.status === "rejected"
                ? "bg-danger/5 border-danger/20"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="text-3xl">
                {redemption.rewards?.icon || "🎁"}
              </div>
              <div>
                <div className="font-semibold">{getRewardName(redemption.rewards, locale)}</div>
                <div className="text-sm text-slate-400">
                  {redemption.stars_spent} {t("common.stars")} • {formatDateTime(redemption.created_at, locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                {redemption.child_note && (
                  <div className="text-xs text-slate-500 mt-1">
                    {t("quests.note")}: {redemption.child_note}
                  </div>
                )}
                {redemption.status === "rejected" && redemption.parent_response && (
                  <div className="text-xs text-danger mt-1">
                    {t("admin.rejectionReason")}: {redemption.parent_response}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(redemption.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
