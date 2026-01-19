// Credit System Types

export interface ChildCreditSettings {
  id: string;
  family_id: string;
  child_id: string;
  credit_limit: number;
  original_credit_limit: number;
  credit_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditInterestTier {
  id: string;
  family_id: string;
  tier_order: number;
  min_debt: number;
  max_debt: number | null; // null means infinity
  interest_rate: number; // decimal, e.g., 0.05 = 5%
  created_at: string;
}

export interface CreditSettlement {
  id: string;
  family_id: string;
  child_id: string;
  settlement_date: string;
  balance_before: number;
  debt_amount: number;
  interest_calculated: number;
  interest_breakdown: InterestBreakdownItem[] | null;
  credit_limit_before: number;
  credit_limit_after: number;
  credit_limit_adjustment: number;
  settled_at: string;
}

export interface InterestBreakdownItem {
  tier_order: number;
  min_debt: number;
  max_debt: number | null;
  debt_in_tier: number;
  interest_rate: number;
  interest_amount: number;
}

export type CreditTransactionType = "credit_used" | "credit_repaid" | "interest_charged";

export interface CreditTransaction {
  id: string;
  family_id: string;
  child_id: string;
  redemption_id: string | null;
  settlement_id: string | null;
  transaction_type: CreditTransactionType;
  amount: number;
  balance_after: number;
  created_at: string;
}

// Extended child balance with credit information
export interface ChildBalanceWithCredit {
  child_id: string;
  family_id: string;
  name: string;
  current_stars: number;
  lifetime_stars: number;
  credit_enabled: boolean;
  credit_limit: number;
  original_credit_limit: number;
  credit_used: number; // Amount of credit currently used (debt)
  available_credit: number; // Remaining credit available
  spendable_stars: number; // Total amount child can spend (balance + available credit)
}

// Form types for creating/updating
export interface CreditSettingsFormData {
  credit_enabled: boolean;
  credit_limit: number;
}

export interface InterestTierFormData {
  tier_order: number;
  min_debt: number;
  max_debt: number | null;
  interest_rate: number;
}

// API response types
export interface InterestCalculationResult {
  total_interest: number;
  breakdown: InterestBreakdownItem[];
}

export interface SettlementResult {
  success: boolean;
  settlement_date: string;
  processed_count: number;
  results: SettlementChildResult[];
}

export interface SettlementChildResult {
  child_id: string;
  debt: number;
  interest: number;
  old_limit: number;
  new_limit: number;
}

// Default interest tiers (matching database defaults)
export const DEFAULT_INTEREST_TIERS: Omit<CreditInterestTier, "id" | "family_id" | "created_at">[] = [
  { tier_order: 1, min_debt: 0, max_debt: 19, interest_rate: 0.05 },
  { tier_order: 2, min_debt: 20, max_debt: 49, interest_rate: 0.10 },
  { tier_order: 3, min_debt: 50, max_debt: null, interest_rate: 0.15 },
];

// Helper functions
export function formatInterestRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

export function formatDebtRange(min: number, max: number | null): string {
  if (max === null) {
    return `${min}+`;
  }
  return `${min}-${max}`;
}

export function calculateTotalSpendable(balance: number, creditEnabled: boolean, availableCredit: number): number {
  if (!creditEnabled) {
    return Math.max(balance, 0);
  }
  return Math.max(balance, 0) + availableCredit;
}

export function getCreditUsed(balance: number): number {
  return balance < 0 ? Math.abs(balance) : 0;
}

export function getAvailableCredit(balance: number, creditLimit: number, creditEnabled: boolean): number {
  if (!creditEnabled) return 0;
  const used = getCreditUsed(balance);
  return Math.max(creditLimit - used, 0);
}
