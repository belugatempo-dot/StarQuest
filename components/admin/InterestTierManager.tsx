"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate, typedInsert } from "@/lib/supabase/helpers";
import type { CreditInterestTier } from "@/types/credit";
import { formatInterestRate, formatDebtRange, DEFAULT_INTEREST_TIERS } from "@/types/credit";

interface InterestTierManagerProps {
  familyId: string;
  locale: string;
}

export default function InterestTierManager({ familyId, locale }: InterestTierManagerProps) {
  const t = useTranslations();
  const supabase = createClient();

  const [tiers, setTiers] = useState<CreditInterestTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<CreditInterestTier | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form state for editing/adding
  const [formMinDebt, setFormMinDebt] = useState(0);
  const [formMaxDebt, setFormMaxDebt] = useState<number | null>(null);
  const [formInterestRate, setFormInterestRate] = useState(5);
  const [hasMaxDebt, setHasMaxDebt] = useState(true);

  useEffect(() => {
    fetchTiers();
  }, [familyId]);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("credit_interest_tiers")
        .select("*")
        .eq("family_id", familyId)
        .order("tier_order", { ascending: true });

      if (fetchError) throw fetchError;
      setTiers(data || []);
    } catch (err) {
      console.error("Error fetching tiers:", err);
      setError(err instanceof Error ? err.message : "Failed to load interest tiers");
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultTiers = async () => {
    setSaving(true);
    setError(null);
    try {
      // Initialize default tiers via RPC or direct insert
      const { error: rpcError } = await (supabase.rpc as any)("initialize_default_interest_tiers", {
        p_family_id: familyId,
      });

      if (rpcError) throw rpcError;
      await fetchTiers();
    } catch (err) {
      console.error("Error initializing tiers:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize tiers");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTier = (tier: CreditInterestTier) => {
    setEditingTier(tier);
    setFormMinDebt(tier.min_debt);
    setFormMaxDebt(tier.max_debt);
    setFormInterestRate(tier.interest_rate * 100);
    setHasMaxDebt(tier.max_debt !== null);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    const nextOrder = tiers.length > 0 ? Math.max(...tiers.map((t) => t.tier_order)) + 1 : 1;
    const lastTier = tiers[tiers.length - 1];
    const suggestedMin = lastTier ? (lastTier.max_debt || lastTier.min_debt) + 1 : 0;

    setEditingTier(null);
    setFormMinDebt(suggestedMin);
    setFormMaxDebt(null);
    setFormInterestRate(10);
    setHasMaxDebt(false);
    setIsAddingNew(true);
  };

  const handleSaveTier = async () => {
    setSaving(true);
    setError(null);

    try {
      const tierData = {
        family_id: familyId,
        min_debt: formMinDebt,
        max_debt: hasMaxDebt ? formMaxDebt : null,
        interest_rate: formInterestRate / 100,
      };

      if (editingTier) {
        // Update existing tier
        const { error: updateError } = await typedUpdate(supabase, "credit_interest_tiers", tierData)
          .eq("id", editingTier.id);

        if (updateError) throw updateError;
      } else if (isAddingNew) {
        // Insert new tier
        const nextOrder = tiers.length > 0 ? Math.max(...tiers.map((t) => t.tier_order)) + 1 : 1;
        const { error: insertError } = await typedInsert(supabase, "credit_interest_tiers", {
            ...tierData,
            tier_order: nextOrder,
          });

        if (insertError) throw insertError;
      }

      setEditingTier(null);
      setIsAddingNew(false);
      await fetchTiers();
    } catch (err) {
      console.error("Error saving tier:", err);
      setError(err instanceof Error ? err.message : "Failed to save tier");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm(t("credit.confirmDeleteTier"))) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from("credit_interest_tiers")
        .delete()
        .eq("id", tierId);

      if (deleteError) throw deleteError;
      await fetchTiers();
    } catch (err) {
      console.error("Error deleting tier:", err);
      setError(err instanceof Error ? err.message : "Failed to delete tier");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingTier(null);
    setIsAddingNew(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{t("credit.interestTiers")}</h2>
          <p className="text-sm text-gray-600">{t("credit.interestTiersDescription")}</p>
        </div>
        {tiers.length > 0 && !editingTier && !isAddingNew && (
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-primary text-gray-900 rounded-lg hover:bg-primary/90 transition font-medium"
          >
            + {t("credit.addTier")}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Empty State */}
      {tiers.length === 0 && !isAddingNew && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">{t("credit.noTiersYet")}</p>
          <button
            onClick={initializeDefaultTiers}
            disabled={saving}
            className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition disabled:opacity-50"
          >
            {saving ? t("common.loading") : t("credit.useDefaultTiers")}
          </button>
        </div>
      )}

      {/* Tier List */}
      {tiers.length > 0 && (
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`border rounded-lg p-4 ${
                editingTier?.id === tier.id ? "border-primary bg-primary/5" : "border-gray-200"
              }`}
            >
              {editingTier?.id === tier.id ? (
                // Edit Form
                <TierEditForm
                  formMinDebt={formMinDebt}
                  setFormMinDebt={setFormMinDebt}
                  formMaxDebt={formMaxDebt}
                  setFormMaxDebt={setFormMaxDebt}
                  hasMaxDebt={hasMaxDebt}
                  setHasMaxDebt={setHasMaxDebt}
                  formInterestRate={formInterestRate}
                  setFormInterestRate={setFormInterestRate}
                  onSave={handleSaveTier}
                  onCancel={cancelEdit}
                  saving={saving}
                  t={t}
                />
              ) : (
                // Display Mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div>
                      <span className="text-sm text-gray-500">{t("credit.debtRange")}:</span>
                      <p className="font-semibold">
                        {formatDebtRange(tier.min_debt, tier.max_debt)} {t("common.stars")}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">{t("credit.interestRate")}:</span>
                      <p className="font-semibold text-warning">
                        {formatInterestRate(tier.interest_rate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTier(tier)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier.id)}
                      className="px-3 py-1 text-sm bg-danger/10 text-danger hover:bg-danger/20 rounded transition"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Form */}
      {isAddingNew && (
        <div className="border border-primary rounded-lg p-4 bg-primary/5 mt-3">
          <h3 className="font-medium mb-3">{t("credit.addNewTier")}</h3>
          <TierEditForm
            formMinDebt={formMinDebt}
            setFormMinDebt={setFormMinDebt}
            formMaxDebt={formMaxDebt}
            setFormMaxDebt={setFormMaxDebt}
            hasMaxDebt={hasMaxDebt}
            setHasMaxDebt={setHasMaxDebt}
            formInterestRate={formInterestRate}
            setFormInterestRate={setFormInterestRate}
            onSave={handleSaveTier}
            onCancel={cancelEdit}
            saving={saving}
            t={t}
          />
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">💡 {t("credit.tip")}:</span>{" "}
          {t("credit.tiersTip")}
        </p>
      </div>
    </div>
  );
}

// Separate component for the tier edit form
interface TierEditFormProps {
  formMinDebt: number;
  setFormMinDebt: (v: number) => void;
  formMaxDebt: number | null;
  setFormMaxDebt: (v: number | null) => void;
  hasMaxDebt: boolean;
  setHasMaxDebt: (v: boolean) => void;
  formInterestRate: number;
  setFormInterestRate: (v: number) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  t: (key: string) => string;
}

function TierEditForm({
  formMinDebt,
  setFormMinDebt,
  formMaxDebt,
  setFormMaxDebt,
  hasMaxDebt,
  setHasMaxDebt,
  formInterestRate,
  setFormInterestRate,
  onSave,
  onCancel,
  saving,
  t,
}: TierEditFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("credit.minDebt")}</label>
          <input
            type="number"
            min={0}
            value={formMinDebt}
            onChange={(e) => setFormMinDebt(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("credit.maxDebt")}
            <label className="ml-2 text-xs">
              <input
                type="checkbox"
                checked={!hasMaxDebt}
                onChange={(e) => {
                  setHasMaxDebt(!e.target.checked);
                  if (e.target.checked) setFormMaxDebt(null);
                }}
                className="mr-1"
              />
              {t("credit.unlimited")}
            </label>
          </label>
          <input
            type="number"
            min={formMinDebt}
            value={formMaxDebt ?? ""}
            onChange={(e) => setFormMaxDebt(e.target.value ? parseInt(e.target.value) : null)}
            disabled={!hasMaxDebt}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          {t("credit.interestRate")} (%)
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min={0}
            max={50}
            value={formInterestRate}
            onChange={(e) => setFormInterestRate(parseInt(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={formInterestRate}
            onChange={(e) => setFormInterestRate(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
          />
          <span className="text-lg font-semibold text-warning">%</span>
        </div>
      </div>
      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-primary text-gray-900 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 font-semibold"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
