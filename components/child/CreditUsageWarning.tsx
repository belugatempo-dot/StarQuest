"use client";

import { useTranslations } from "next-intl";

interface CreditUsageWarningProps {
  creditAmount: number; // How much credit will be used
  currentDebt: number; // Existing debt
  newTotalDebt: number; // Debt after this redemption
  creditLimit: number; // Total credit limit
  locale: string;
}

export default function CreditUsageWarning({
  creditAmount,
  currentDebt,
  newTotalDebt,
  creditLimit,
  locale,
}: CreditUsageWarningProps) {
  const t = useTranslations();

  if (creditAmount <= 0) {
    return null;
  }

  const usagePercent = (newTotalDebt / creditLimit) * 100;
  const isHighUsage = usagePercent > 80;
  const isMediumUsage = usagePercent > 50;

  return (
    <div className={`rounded-lg p-4 border-2 ${
      isHighUsage
        ? "bg-danger/10 border-danger"
        : isMediumUsage
        ? "bg-warning/10 border-warning"
        : "bg-orange-500/10 border-orange-500/30"
    }`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h4 className={`font-semibold ${
            isHighUsage ? "text-danger" : isMediumUsage ? "text-warning-dark" : "text-orange-300"
          }`}>
            {t("credit.borrowingWarningTitle")}
          </h4>
          <p className="text-sm mt-1 text-slate-300">
            {t("credit.borrowingWarningMessage", { amount: creditAmount })}
          </p>

          {/* Breakdown */}
          <div className="mt-3 bg-white/10 rounded p-3 space-y-1 text-sm">
            {currentDebt > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">{t("credit.currentDebt")}:</span>
                <span className="font-medium text-danger">{currentDebt} ⭐</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">{t("credit.borrowing")}:</span>
              <span className="font-medium text-warning">+{creditAmount} ⭐</span>
            </div>
            <div className="border-t border-white/10 pt-1 mt-1">
              <div className="flex justify-between">
                <span className="font-medium">{t("credit.totalDebtAfter")}:</span>
                <span className={`font-bold ${isHighUsage ? "text-danger" : "text-warning"}`}>
                  {newTotalDebt} ⭐
                </span>
              </div>
            </div>
          </div>

          {/* Usage indicator */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{t("credit.creditUsage")}</span>
              <span className={isHighUsage ? "text-danger" : isMediumUsage ? "text-warning" : "text-slate-400"}>
                {newTotalDebt} / {creditLimit}
              </span>
            </div>
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isHighUsage ? "bg-danger" : isMediumUsage ? "bg-warning" : "bg-orange-400"
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Warning text */}
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-400">
              💡 {t("credit.interestWarning")}
            </p>
            {isHighUsage && (
              <p className="text-xs text-danger font-medium">
                ⚠️ {t("credit.highUsageWarning")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
