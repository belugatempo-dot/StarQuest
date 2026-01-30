export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          name: string;
          settlement_day: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          settlement_day?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          settlement_day?: number;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          family_id: string | null;
          name: string;
          role: "parent" | "child";
          email: string | null;
          avatar_url: string | null;
          locale: "en" | "zh-CN";
          created_at: string;
        };
        Insert: {
          id: string;
          family_id?: string | null;
          name: string;
          role: "parent" | "child";
          email?: string | null;
          avatar_url?: string | null;
          locale?: "en" | "zh-CN";
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string | null;
          name?: string;
          role?: "parent" | "child";
          email?: string | null;
          avatar_url?: string | null;
          locale?: "en" | "zh-CN";
          created_at?: string;
        };
      };
      quests: {
        Row: {
          id: string;
          family_id: string;
          name_en: string;
          name_zh: string | null;
          stars: number;
          type: "duty" | "bonus" | "violation";
          scope: "self" | "family" | "other";
          category: string | null;
          icon: string | null;
          is_positive: boolean;
          is_active: boolean;
          max_per_day: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name_en: string;
          name_zh?: string | null;
          stars: number;
          type?: "duty" | "bonus" | "violation";
          scope?: "self" | "family" | "other";
          category?: string | null;
          icon?: string | null;
          is_active?: boolean;
          max_per_day?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name_en?: string;
          name_zh?: string | null;
          stars?: number;
          type?: "duty" | "bonus" | "violation";
          scope?: "self" | "family" | "other";
          category?: string | null;
          icon?: string | null;
          is_active?: boolean;
          max_per_day?: number;
          sort_order?: number;
          created_at?: string;
        };
      };
      star_transactions: {
        Row: {
          id: string;
          family_id: string;
          child_id: string;
          quest_id: string | null;
          custom_description: string | null;
          stars: number;
          source: "parent_record" | "child_request";
          status: "pending" | "approved" | "rejected";
          child_note: string | null;
          parent_response: string | null;
          created_by: string;
          reviewed_by: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          child_id: string;
          quest_id?: string | null;
          custom_description?: string | null;
          stars: number;
          source: "parent_record" | "child_request";
          status?: "pending" | "approved" | "rejected";
          child_note?: string | null;
          parent_response?: string | null;
          created_by: string;
          reviewed_by?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          family_id?: string;
          child_id?: string;
          quest_id?: string | null;
          custom_description?: string | null;
          stars?: number;
          source?: "parent_record" | "child_request";
          status?: "pending" | "approved" | "rejected";
          child_note?: string | null;
          parent_response?: string | null;
          created_by?: string;
          reviewed_by?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
      };
      rewards: {
        Row: {
          id: string;
          family_id: string;
          name_en: string;
          name_zh: string | null;
          stars_cost: number;
          category: "screen_time" | "toys" | "activities" | "treats" | "other" | null;
          description: string | null;
          icon: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name_en: string;
          name_zh?: string | null;
          stars_cost: number;
          category?: "screen_time" | "toys" | "activities" | "treats" | "other" | null;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name_en?: string;
          name_zh?: string | null;
          stars_cost?: number;
          category?: "screen_time" | "toys" | "activities" | "treats" | "other" | null;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      redemptions: {
        Row: {
          id: string;
          family_id: string;
          child_id: string;
          reward_id: string;
          stars_spent: number;
          status: "pending" | "approved" | "rejected" | "fulfilled";
          child_note: string | null;
          parent_response: string | null;
          uses_credit: boolean;
          credit_amount: number;
          created_at: string;
          reviewed_at: string | null;
          fulfilled_at: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          child_id: string;
          reward_id: string;
          stars_spent: number;
          status?: "pending" | "approved" | "rejected" | "fulfilled";
          child_note?: string | null;
          parent_response?: string | null;
          uses_credit?: boolean;
          credit_amount?: number;
          created_at?: string;
          reviewed_at?: string | null;
          fulfilled_at?: string | null;
        };
        Update: {
          id?: string;
          family_id?: string;
          child_id?: string;
          reward_id?: string;
          stars_spent?: number;
          status?: "pending" | "approved" | "rejected" | "fulfilled";
          child_note?: string | null;
          parent_response?: string | null;
          uses_credit?: boolean;
          credit_amount?: number;
          created_at?: string;
          reviewed_at?: string | null;
          fulfilled_at?: string | null;
        };
      };
      levels: {
        Row: {
          id: string;
          family_id: string;
          level_number: number;
          name_en: string;
          name_zh: string | null;
          stars_required: number;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          level_number: number;
          name_en: string;
          name_zh?: string | null;
          stars_required: number;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          level_number?: number;
          name_en?: string;
          name_zh?: string | null;
          stars_required?: number;
          icon?: string | null;
          created_at?: string;
        };
      };
      child_credit_settings: {
        Row: {
          id: string;
          family_id: string;
          child_id: string;
          credit_limit: number;
          original_credit_limit: number;
          credit_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          child_id: string;
          credit_limit?: number;
          original_credit_limit?: number;
          credit_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          child_id?: string;
          credit_limit?: number;
          original_credit_limit?: number;
          credit_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_interest_tiers: {
        Row: {
          id: string;
          family_id: string;
          tier_order: number;
          min_debt: number;
          max_debt: number | null;
          interest_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          tier_order: number;
          min_debt: number;
          max_debt?: number | null;
          interest_rate: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          tier_order?: number;
          min_debt?: number;
          max_debt?: number | null;
          interest_rate?: number;
          created_at?: string;
        };
      };
      credit_settlements: {
        Row: {
          id: string;
          family_id: string;
          child_id: string;
          settlement_date: string;
          balance_before: number;
          debt_amount: number;
          interest_calculated: number;
          interest_breakdown: any;
          credit_limit_before: number;
          credit_limit_after: number;
          credit_limit_adjustment: number;
          settled_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          child_id: string;
          settlement_date: string;
          balance_before: number;
          debt_amount: number;
          interest_calculated: number;
          interest_breakdown?: any;
          credit_limit_before: number;
          credit_limit_after: number;
          credit_limit_adjustment: number;
          settled_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          child_id?: string;
          settlement_date?: string;
          balance_before?: number;
          debt_amount?: number;
          interest_calculated?: number;
          interest_breakdown?: any;
          credit_limit_before?: number;
          credit_limit_after?: number;
          credit_limit_adjustment?: number;
          settled_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          family_id: string;
          child_id: string;
          redemption_id: string | null;
          settlement_id: string | null;
          transaction_type: "credit_used" | "credit_repaid" | "interest_charged";
          amount: number;
          balance_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          child_id: string;
          redemption_id?: string | null;
          settlement_id?: string | null;
          transaction_type: "credit_used" | "credit_repaid" | "interest_charged";
          amount: number;
          balance_after: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          child_id?: string;
          redemption_id?: string | null;
          settlement_id?: string | null;
          transaction_type?: "credit_used" | "credit_repaid" | "interest_charged";
          amount?: number;
          balance_after?: number;
          created_at?: string;
        };
      };
      family_report_preferences: {
        Row: {
          id: string;
          family_id: string;
          report_email: string | null;
          weekly_report_enabled: boolean;
          monthly_report_enabled: boolean;
          settlement_email_enabled: boolean;
          timezone: string;
          report_locale: "en" | "zh-CN";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          report_email?: string | null;
          weekly_report_enabled?: boolean;
          monthly_report_enabled?: boolean;
          settlement_email_enabled?: boolean;
          timezone?: string;
          report_locale?: "en" | "zh-CN";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          report_email?: string | null;
          weekly_report_enabled?: boolean;
          monthly_report_enabled?: boolean;
          settlement_email_enabled?: boolean;
          timezone?: string;
          report_locale?: "en" | "zh-CN";
          created_at?: string;
          updated_at?: string;
        };
      };
      report_history: {
        Row: {
          id: string;
          family_id: string;
          report_type: "weekly" | "monthly" | "settlement";
          report_period_start: string;
          report_period_end: string;
          status: "pending" | "sent" | "failed" | "skipped";
          sent_to_email: string | null;
          report_data: Record<string, unknown> | null;
          error_message: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          report_type: "weekly" | "monthly" | "settlement";
          report_period_start: string;
          report_period_end: string;
          status?: "pending" | "sent" | "failed" | "skipped";
          sent_to_email?: string | null;
          report_data?: Record<string, unknown> | null;
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          report_type?: "weekly" | "monthly" | "settlement";
          report_period_start?: string;
          report_period_end?: string;
          status?: "pending" | "sent" | "failed" | "skipped";
          sent_to_email?: string | null;
          report_data?: Record<string, unknown> | null;
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
      };
      quest_categories: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          name_en: string;
          name_zh: string | null;
          icon: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          name_en: string;
          name_zh?: string | null;
          icon?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          name_en?: string;
          name_zh?: string | null;
          icon?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      child_balances: {
        Row: {
          child_id: string;
          family_id: string;
          name: string;
          current_stars: number;
          lifetime_stars: number;
          credit_enabled: boolean;
          credit_limit: number;
          original_credit_limit: number;
          credit_used: number;
          available_credit: number;
          spendable_stars: number;
        };
      };
    };
    Functions: {};
    Enums: {};
  };
}
