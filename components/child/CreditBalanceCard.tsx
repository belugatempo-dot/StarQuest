"use client";

import { useTranslations } from "next-intl";
import type { ChildBalanceWithCredit } from "@/types/credit";

interface CreditBalanceCardProps {
  balance: ChildBalanceWithCredit;
  locale: string;
}

export default function CreditBalanceCard({ balance, locale }: CreditBalanceCardProps) {
  const t = useTranslations();

  // Don't show if credit is not enabled
  if (!balance.credit_enabled) {
    return null;
  }

  const hasDebt = balance.credit_used > 0;
  const usagePercent = balance.credit_limit > 0
    ? (balance.credit_used / balance.credit_limit) * 100
    : 0;
  const isHighUsage = usagePercent > 80;
  const isMediumUsage = usagePercent > 50;

  return (
    <div className={`rounded-lg p-4 ${hasDebt ? "bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30" : "bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30"}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center">
          <span className="text-xl mr-2">💳</span>
          {t("credit.creditAccount")}
        </h3>
        {hasDebt && (
          <span className="text-xs bg-warning/20 text-warning-dark px-2 py-1 rounded-full">
            {t("credit.hasDebt")}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Current Balance */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">{t("credit.yourBalance")}:</span>
          <span className={`text-lg font-bold ${balance.current_stars < 0 ? "text-danger" : "text-success"}`}>
            {balance.current_stars} ⭐
          </span>
        </div>

        {/* Debt Info (if any) */}
        {hasDebt && (
          <div className="bg-white/10 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{t("credit.youOwe")}:</span>
              <span className="font-semibold text-danger">{balance.credit_used} ⭐</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{t("credit.creditLimit")}:</span>
              <span className="font-medium">{balance.credit_limit} ⭐</span>
            </div>

            {/* Usage Bar */}
            <div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isHighUsage ? "bg-danger" : isMediumUsage ? "bg-warning" : "bg-success"
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-center mt-1 text-slate-400">
                {balance.credit_used} / {balance.credit_limit} {t("credit.used")}
              </p>
            </div>
          </div>
        )}

        {/* Available Credit */}
        {!hasDebt && balance.available_credit > 0 && (
          <div className="flex justify-between items-center bg-white/10 rounded-lg p-3">
            <span className="text-sm text-slate-400">{t("credit.availableCredit")}:</span>
            <span className="font-semibold text-secondary">{balance.available_credit} ⭐</span>
          </div>
        )}

        {/* Spendable Total */}
        <div className="border-t border-white/10 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{t("credit.canSpend")}:</span>
            <span className="text-xl font-bold text-primary">{balance.spendable_stars} ⭐</span>
          </div>
        </div>

        {/* Info Message */}
        {hasDebt && (
          <p className="text-xs text-slate-400 mt-2">
            💡 {t("credit.debtRepaymentInfo")}
          </p>
        )}
      </div>
    </div>
  );
}
