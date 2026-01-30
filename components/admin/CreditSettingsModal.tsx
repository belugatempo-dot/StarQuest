"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ModalFrame from "@/components/ui/ModalFrame";
import type { ChildCreditSettings, ChildBalanceWithCredit } from "@/types/credit";

interface CreditSettingsModalProps {
  child: {
    id: string;
    name: string;
    family_id: string;
  };
  balance: ChildBalanceWithCredit | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreditSettingsModal({
  child,
  balance,
  onClose,
  onSuccess,
}: CreditSettingsModalProps) {
  const t = useTranslations();
  const supabase = createClient();

  const [creditEnabled, setCreditEnabled] = useState(balance?.credit_enabled || false);
  const [creditLimit, setCreditLimit] = useState(balance?.credit_limit || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with balance prop when it changes
  useEffect(() => {
    if (balance) {
      setCreditEnabled(balance.credit_enabled);
      setCreditLimit(balance.credit_limit);
    }
  }, [balance]);

  const currentDebt = balance?.credit_used || 0;
  const hasDebt = currentDebt > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("child_credit_settings")
        .select("id")
        .eq("child_id", child.id)
        .maybeSingle();

      if (existing) {
        // Update existing settings
        const { error: updateError } = await (supabase
          .from("child_credit_settings")
          .update as any)({
            credit_enabled: creditEnabled,
            credit_limit: creditLimit,
            original_credit_limit: creditEnabled ? creditLimit : 0,
          })
          .eq("child_id", child.id);

        if (updateError) throw updateError;
      } else {
        // Create new settings
        const { error: insertError } = await (supabase
          .from("child_credit_settings")
          .insert as any)({
            family_id: child.family_id,
            child_id: child.id,
            credit_enabled: creditEnabled,
            credit_limit: creditLimit,
            original_credit_limit: creditEnabled ? creditLimit : 0,
          });

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err) {
      console.error("Error saving credit settings:", err);
      setError(err instanceof Error ? err.message : t("credit.saveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      title={t("credit.settingsTitle")}
      subtitle={`${t("credit.settingsFor")}: ${child.name}`}
      onClose={onClose}
    >
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          {/* Current Status */}
          {balance && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("credit.currentBalance")}:</span>
                <span className={`font-semibold ${balance.current_stars < 0 ? "text-danger" : "text-success"}`}>
                  {balance.current_stars} {t("common.stars")}
                </span>
              </div>
              {hasDebt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("credit.currentDebt")}:</span>
                  <span className="font-semibold text-danger">
                    {currentDebt} {t("common.stars")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Enable Credit Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="credit-enabled" className="font-medium">
                {t("credit.enableCredit")}
              </label>
              <p className="text-sm text-gray-500">
                {t("credit.enableCreditDescription")}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="credit-enabled"
                type="checkbox"
                checked={creditEnabled}
                onChange={(e) => setCreditEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Credit Limit */}
          {creditEnabled && (
            <div>
              <label htmlFor="credit-limit" className="block font-medium mb-2">
                {t("credit.creditLimit")}
              </label>
              <div className="relative">
                <input
                  id="credit-limit"
                  type="number"
                  min={hasDebt ? currentDebt : 0}
                  max={1000}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {t("common.stars")}
                </span>
              </div>
              {hasDebt && creditLimit < currentDebt && (
                <p className="text-sm text-warning mt-1">
                  {t("credit.limitBelowDebtWarning")}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {t("credit.creditLimitDescription")}
              </p>
            </div>
          )}

          {/* Disable Warning */}
          {!creditEnabled && hasDebt && (
            <div className="bg-warning/10 border border-warning rounded-lg p-4">
              <p className="text-sm text-warning-dark">
                <span className="font-semibold">⚠️ {t("credit.warning")}:</span>{" "}
                {t("credit.disableWithDebtWarning")}
              </p>
            </div>
          )}

          {/* Interest Info */}
          {creditEnabled && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">📊 {t("credit.note")}:</span>{" "}
                {t("credit.interestInfo")}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-gray-900 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
    </ModalFrame>
  );
}
