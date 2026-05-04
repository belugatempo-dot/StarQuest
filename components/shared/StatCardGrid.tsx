"use client";

import { useTranslations } from "next-intl";
import StatCard from "@/components/ui/StatCard";

interface StatCardGridProps {
  locale: string;
  totalRecords: number;
  positiveRecords: number;
  negativeRecords: number;
  totalStarsGiven: number;
  totalStarsDeducted: number;
  starsRedeemed: number;
  totalCreditBorrowed: number;
  netStars: number;
}

export default function StatCardGrid({
  locale,
  totalRecords,
  positiveRecords,
  negativeRecords,
  totalStarsGiven,
  totalStarsDeducted,
  starsRedeemed,
  totalCreditBorrowed,
  netStars,
}: StatCardGridProps) {
  const t = useTranslations("stats");
  const isZh = locale === "zh-CN";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label={isZh ? "总记录" : "Total Records"}
        value={totalRecords}
        tooltip={t("totalRecords")}
        labelColor="text-star-glow"
      />
      <StatCard
        label={isZh ? "加分记录" : "Positive"}
        value={positiveRecords}
        tooltip={t("positive")}
        valueColor="text-green-400"
      />
      <StatCard
        label={isZh ? "扣分记录" : "Negative"}
        value={negativeRecords}
        tooltip={t("negative")}
        valueColor="text-red-400"
      />
      <StatCard
        label={isZh ? "总星星+" : "Total Stars +"}
        value={`+${totalStarsGiven}`}
        tooltip={t("totalStarsPlus")}
        valueColor="text-green-400"
      />
      <StatCard
        label={isZh ? "总星星-" : "Total Stars -"}
        value={totalStarsDeducted}
        tooltip={t("totalStarsMinus")}
        valueColor="text-red-400"
      />
      <StatCard
        label={isZh ? "星星兑换" : "Stars Redeemed"}
        value={starsRedeemed}
        tooltip={t("starsRedeemed")}
        icon="🎁"
        labelColor="text-purple-300"
        valueColor="text-purple-300"
      />
      <StatCard
        label={isZh ? "欠款" : "Outstanding Debt"}
        value={totalCreditBorrowed}
        tooltip={t("creditBorrowed")}
        icon="💳"
        labelColor="text-blue-300"
        valueColor={totalCreditBorrowed > 0 ? "text-red-400" : "text-blue-300"}
      />
      <StatCard
        label={isZh ? "净值" : "Net Stars"}
        value={netStars >= 0 ? `+${netStars}` : netStars}
        tooltip={t("netStars")}
        icon="⭐"
        cardClass="net-stars-card"
        labelColor="text-star-glow"
        valueColor={netStars >= 0 ? "text-green-400" : "text-red-400"}
      />
    </div>
  );
}
