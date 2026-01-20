"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import CreditSettingsModal from "@/components/admin/CreditSettingsModal";
import InterestTierManager from "@/components/admin/InterestTierManager";
import SettlementHistoryTable from "@/components/admin/SettlementHistoryTable";
import type { ChildBalanceWithCredit, ChildCreditSettings } from "@/types/credit";

interface Child {
  id: string;
  name: string;
  family_id: string;
}

interface CreditManagementClientProps {
  familyId: string;
  children: Child[];
  balances: any[];
  creditSettings: any[];
  settlementDay: number;
  locale: string;
}

export default function CreditManagementClient({
  familyId,
  children,
  balances,
  creditSettings,
  settlementDay: initialSettlementDay,
  locale,
}: CreditManagementClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settlementDay, setSettlementDay] = useState(initialSettlementDay);
  const [savingSettlementDay, setSavingSettlementDay] = useState(false);
  const [settlementDayError, setSettlementDayError] = useState<string | null>(null);

  // Get balance for a child
  const getBalance = (childId: string): ChildBalanceWithCredit | null => {
    const balance = balances.find((b: any) => b.child_id === childId);
    if (!balance) return null;
    return balance as ChildBalanceWithCredit;
  };

  // Get credit settings for a child
  const getCreditSettings = (childId: string): ChildCreditSettings | null => {
    return creditSettings.find((s: any) => s.child_id === childId) || null;
  };

  const handleOpenSettings = (child: Child) => {
    setSelectedChild(child);
    setShowSettingsModal(true);
  };

  const handleCloseSettings = () => {
    setSelectedChild(null);
    setShowSettingsModal(false);
  };

  const handleSettingsSuccess = () => {
    handleCloseSettings();
    router.refresh();
  };

  const handleSettlementDayChange = async (newDay: number) => {
    if (newDay < 1 || newDay > 28) return;

    setSavingSettlementDay(true);
    setSettlementDayError(null);

    try {
      const result = await (supabase
        .from("families") as any)
        .update({ settlement_day: newDay })
        .eq("id", familyId)
        .select();

      console.log("Settlement day update result:", { error: result.error, data: result.data, newDay, familyId });

      if (result.error) throw result.error;

      setSettlementDay(newDay);
      router.refresh();
    } catch (err) {
      console.error("Error saving settlement day:", err);
      setSettlementDayError(t("credit.settlementDaySaveError"));
    } finally {
      setSavingSettlementDay(false);
    }
  };

  return (
    <>
      {/* Children Credit Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">{t("credit.childrenOverview")}</h2>

        {children.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">{t("credit.noChildren")}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => {
              const balance = getBalance(child.id);
              const creditEnabled = balance?.credit_enabled || false;
              const creditLimit = balance?.credit_limit || 0;
              const creditUsed = balance?.credit_used || 0;
              const availableCredit = balance?.available_credit || 0;
              const currentStars = balance?.current_stars || 0;

              return (
                <div
                  key={child.id}
                  className={`border rounded-lg p-4 ${
                    creditEnabled ? "border-primary bg-primary/5" : "border-gray-200"
                  }`}
                >
                  {/* Child Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                        👤
                      </div>
                      <div>
                        <h3 className="font-semibold">{child.name}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            creditEnabled
                              ? "bg-primary/20 text-primary-dark"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {creditEnabled ? t("credit.enabled") : t("credit.disabled")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balance Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t("credit.currentBalance")}:</span>
                      <span
                        className={`font-medium ${
                          currentStars < 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        {currentStars} ⭐
                      </span>
                    </div>

                    {creditEnabled && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t("credit.creditLimit")}:</span>
                          <span className="font-medium">{creditLimit} ⭐</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t("credit.creditUsed")}:</span>
                          <span className={`font-medium ${creditUsed > 0 ? "text-warning" : ""}`}>
                            {creditUsed} ⭐
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t("credit.availableCredit")}:</span>
                          <span className="font-medium text-secondary">{availableCredit} ⭐</span>
                        </div>

                        {/* Credit Usage Bar */}
                        {creditLimit > 0 && (
                          <div className="mt-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  creditUsed / creditLimit > 0.8
                                    ? "bg-danger"
                                    : creditUsed / creditLimit > 0.5
                                    ? "bg-warning"
                                    : "bg-success"
                                }`}
                                style={{ width: `${Math.min((creditUsed / creditLimit) * 100, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-center">
                              {creditUsed} / {creditLimit} {t("credit.used")}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleOpenSettings(child)}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                  >
                    {creditEnabled ? t("credit.editSettings") : t("credit.enableCredit")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interest Tier Manager */}
      <InterestTierManager familyId={familyId} locale={locale} />

      {/* Settlement History */}
      <SettlementHistoryTable familyId={familyId} locale={locale} />

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">
            📅 {t("credit.settlementSchedule")}
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-blue-700">
              {t("credit.settlementDayLabel")}
            </p>
            <div className="flex items-center gap-3">
              <select
                value={settlementDay}
                onChange={(e) => handleSettlementDayChange(parseInt(e.target.value))}
                disabled={savingSettlementDay}
                className="px-3 py-2 border border-blue-300 rounded-lg bg-white text-blue-800 font-medium focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {t("credit.dayOfMonth", { day })}
                  </option>
                ))}
              </select>
              {savingSettlementDay && (
                <span className="text-sm text-blue-600">{t("common.saving")}</span>
              )}
            </div>
            {settlementDayError && (
              <p className="text-sm text-danger">{settlementDayError}</p>
            )}
            <p className="text-xs text-blue-600">
              {t("credit.settlementDayNote")}
            </p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">
            💡 {t("credit.autoRepayment")}
          </h3>
          <p className="text-sm text-yellow-700">
            {t("credit.autoRepaymentInfo")}
          </p>
        </div>
      </div>

      {/* Credit Settings Modal */}
      {showSettingsModal && selectedChild && (
        <CreditSettingsModal
          child={selectedChild}
          balance={getBalance(selectedChild.id)}
          onClose={handleCloseSettings}
          onSuccess={handleSettingsSuccess}
        />
      )}
    </>
  );
}
