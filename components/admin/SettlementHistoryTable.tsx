"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { formatDateOnly } from "@/lib/date-utils";
import type { CreditSettlement, InterestBreakdownItem } from "@/types/credit";
import { formatInterestRate } from "@/types/credit";

interface SettlementHistoryTableProps {
  familyId: string;
  childId?: string; // Optional: filter by specific child
  locale: string;
}

interface SettlementWithChild extends CreditSettlement {
  child_name?: string;
}

export default function SettlementHistoryTable({
  familyId,
  childId,
  locale,
}: SettlementHistoryTableProps) {
  const t = useTranslations();
  const supabase = createClient();

  const [settlements, setSettlements] = useState<SettlementWithChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettlements();
  }, [familyId, childId]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("credit_settlements")
        .select(`
          *,
          users:child_id (name)
        `)
        .eq("family_id", familyId)
        .order("settlement_date", { ascending: false })
        .limit(50);

      if (childId) {
        query = query.eq("child_id", childId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to include child name
      const transformedData = (data || []).map((s: any) => ({
        ...s,
        child_name: s.users?.name || "Unknown",
      }));

      setSettlements(transformedData);
    } catch (err) {
      console.error("Error fetching settlements:", err);
      setError(err instanceof Error ? err.message : "Failed to load settlements");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="dark-card rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/15 rounded w-1/3"></div>
          <div className="h-32 bg-white/15 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark-card rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">{t("credit.settlementHistory")}</h2>

      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {settlements.length === 0 ? (
        <div className="text-center py-8 bg-white/5 rounded-lg">
          <p className="text-slate-400">{t("credit.noSettlementsYet")}</p>
          <p className="text-sm text-slate-400 mt-2">{t("credit.settlementsInfo")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-400">
                  {t("credit.settlementDate")}
                </th>
                {!childId && (
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-400">
                    {t("credit.child")}
                  </th>
                )}
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-400">
                  {t("credit.debt")}
                </th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-400">
                  {t("credit.interest")}
                </th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-400">
                  {t("credit.limitChange")}
                </th>
                <th className="text-center py-3 px-2 text-sm font-medium text-slate-400">
                  {t("credit.details")}
                </th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <>
                  <tr
                    key={settlement.id}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <td className="py-3 px-2">
                      {formatDateOnly(settlement.settlement_date, locale)}
                    </td>
                    {!childId && (
                      <td className="py-3 px-2">{settlement.child_name}</td>
                    )}
                    <td className="py-3 px-2 text-right">
                      <span className={settlement.debt_amount > 0 ? "text-danger" : "text-success"}>
                        {settlement.debt_amount > 0 ? `-${settlement.debt_amount}` : "0"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={settlement.interest_calculated > 0 ? "text-warning" : ""}>
                        {settlement.interest_calculated > 0
                          ? `+${settlement.interest_calculated}`
                          : "0"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={
                          settlement.credit_limit_adjustment > 0
                            ? "text-success"
                            : settlement.credit_limit_adjustment < 0
                            ? "text-danger"
                            : ""
                        }
                      >
                        {settlement.credit_limit_adjustment > 0
                          ? `+${settlement.credit_limit_adjustment}`
                          : settlement.credit_limit_adjustment}
                      </span>
                      <span className="text-slate-500 text-xs ml-1">
                        ({settlement.credit_limit_before} → {settlement.credit_limit_after})
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => toggleExpand(settlement.id)}
                        className="text-primary hover:text-primary/80 text-sm"
                      >
                        {expandedId === settlement.id ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>
                  {/* Expanded Details Row */}
                  {expandedId === settlement.id && (
                    <tr key={`${settlement.id}-details`}>
                      <td colSpan={childId ? 5 : 6} className="bg-white/5 px-4 py-3">
                        <div className="space-y-3">
                          {/* Balance Info */}
                          <div className="flex space-x-6 text-sm">
                            <div>
                              <span className="text-slate-400">{t("credit.balanceBefore")}:</span>
                              <span
                                className={`ml-2 font-medium ${
                                  settlement.balance_before < 0 ? "text-danger" : ""
                                }`}
                              >
                                {settlement.balance_before} {t("common.stars")}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">{t("credit.settledAt")}:</span>
                              <span className="ml-2">
                                {new Date(settlement.settled_at).toLocaleString(
                                  locale === "zh-CN" ? "zh-CN" : "en-US"
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Interest Breakdown */}
                          {settlement.interest_breakdown &&
                            Array.isArray(settlement.interest_breakdown) &&
                            settlement.interest_breakdown.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">
                                  {t("credit.interestBreakdown")}:
                                </h4>
                                <div className="bg-white/5 rounded border border-white/10 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-white/10">
                                      <tr>
                                        <th className="text-left py-2 px-3">{t("credit.tier")}</th>
                                        <th className="text-right py-2 px-3">{t("credit.debtInTier")}</th>
                                        <th className="text-right py-2 px-3">{t("credit.rate")}</th>
                                        <th className="text-right py-2 px-3">{t("credit.interest")}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(settlement.interest_breakdown as InterestBreakdownItem[]).map(
                                        (item, idx) => (
                                          <tr key={idx} className="border-t border-white/10">
                                            <td className="py-2 px-3">
                                              {item.min_debt}-{item.max_debt ?? "∞"}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                              {item.debt_in_tier}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                              {formatInterestRate(item.interest_rate)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-medium text-warning">
                                              +{item.interest_amount}
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                          {/* No Interest Case */}
                          {settlement.interest_calculated === 0 && (
                            <p className="text-sm text-success">
                              ✓ {t("credit.noInterestCharged")}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
