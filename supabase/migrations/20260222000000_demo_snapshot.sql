-- Demo Data Snapshot: table + two RPC functions for fast demo restore.
-- save_demo_snapshot(p_family_id) captures all 15 family tables as JSONB.
-- restore_demo_data() atomically deletes + re-inserts from snapshot (1 round trip).

-- 1. Snapshot storage table
CREATE TABLE IF NOT EXISTS demo_data_snapshot (
  table_name TEXT PRIMARY KEY,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE demo_data_snapshot ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write snapshots
CREATE POLICY "service_role_all" ON demo_data_snapshot
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. save_demo_snapshot: captures all family data as JSONB
CREATE OR REPLACE FUNCTION save_demo_snapshot(p_family_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert each table's rows as a JSONB array
  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('families', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM families t WHERE id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('users', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM users t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('quest_categories', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM quest_categories t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('levels', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM levels t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('quests', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM quests t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('rewards', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM rewards t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('star_transactions', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM star_transactions t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('redemptions', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM redemptions t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('credit_interest_tiers', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM credit_interest_tiers t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('child_credit_settings', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM child_credit_settings t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('credit_transactions', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM credit_transactions t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('credit_settlements', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM credit_settlements t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('family_report_preferences', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM family_report_preferences t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('report_history', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM report_history t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;

  INSERT INTO demo_data_snapshot (table_name, rows, updated_at)
  VALUES ('family_invites', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM family_invites t WHERE family_id = p_family_id), NOW())
  ON CONFLICT (table_name) DO UPDATE SET rows = EXCLUDED.rows, updated_at = EXCLUDED.updated_at;
END;
$$;

-- 3. restore_demo_data: atomically deletes + re-inserts from snapshot
CREATE OR REPLACE FUNCTION restore_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_rows JSONB;
  r JSONB;
BEGIN
  -- Extract family_id from snapshot
  SELECT (rows->0->>'id')::UUID INTO v_family_id
  FROM demo_data_snapshot WHERE table_name = 'families';

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'No demo snapshot found';
  END IF;

  -- Disable auto-repay trigger during restore to prevent side effects
  ALTER TABLE star_transactions DISABLE TRIGGER auto_repay_credit_on_star_transaction;

  -- Delete in FK dependency order (most dependent first)
  DELETE FROM credit_transactions WHERE family_id = v_family_id;
  DELETE FROM credit_settlements WHERE family_id = v_family_id;
  DELETE FROM child_credit_settings WHERE family_id = v_family_id;
  DELETE FROM credit_interest_tiers WHERE family_id = v_family_id;
  DELETE FROM star_transactions WHERE family_id = v_family_id;
  DELETE FROM redemptions WHERE family_id = v_family_id;
  DELETE FROM report_history WHERE family_id = v_family_id;
  DELETE FROM family_report_preferences WHERE family_id = v_family_id;
  DELETE FROM family_invites WHERE family_id = v_family_id;
  DELETE FROM rewards WHERE family_id = v_family_id;
  DELETE FROM quests WHERE family_id = v_family_id;
  DELETE FROM levels WHERE family_id = v_family_id;
  DELETE FROM quest_categories WHERE family_id = v_family_id;
  DELETE FROM users WHERE family_id = v_family_id;
  DELETE FROM families WHERE id = v_family_id;

  -- Insert in dependency order (parents first)

  -- families
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'families';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO families (id, name, created_at)
    VALUES (
      (r->>'id')::UUID,
      r->>'name',
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- users
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'users';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO users (id, family_id, name, role, email, avatar_url, locale, is_demo, created_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      r->>'name',
      r->>'role',
      r->>'email',
      r->>'avatar_url',
      r->>'locale',
      COALESCE((r->>'is_demo')::BOOLEAN, false),
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- quest_categories
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'quest_categories';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO quest_categories (id, family_id, name, name_en, name_zh, icon, is_active, sort_order, created_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      r->>'name',
      r->>'name_en',
      r->>'name_zh',
      r->>'icon',
      (r->>'is_active')::BOOLEAN,
      (r->>'sort_order')::INTEGER,
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- levels
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'levels';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO levels (id, family_id, level_number, name_en, name_zh, stars_required, icon, created_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      (r->>'level_number')::INTEGER,
      r->>'name_en',
      r->>'name_zh',
      (r->>'stars_required')::INTEGER,
      r->>'icon',
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- quests (exclude is_positive — GENERATED ALWAYS column)
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'quests';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO quests (id, family_id, name_en, name_zh, stars, type, scope, category, icon, is_active, max_per_day, sort_order, created_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      r->>'name_en',
      r->>'name_zh',
      (r->>'stars')::INTEGER,
      r->>'type',
      r->>'scope',
      r->>'category',
      r->>'icon',
      (r->>'is_active')::BOOLEAN,
      (r->>'max_per_day')::INTEGER,
      (r->>'sort_order')::INTEGER,
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- rewards
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'rewards';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO rewards (id, family_id, name_en, name_zh, stars_cost, category, description, icon, is_active, sort_order, created_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      r->>'name_en',
      r->>'name_zh',
      (r->>'stars_cost')::INTEGER,
      r->>'category',
      r->>'description',
      r->>'icon',
      (r->>'is_active')::BOOLEAN,
      (r->>'sort_order')::INTEGER,
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- star_transactions
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'star_transactions';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO star_transactions (id, family_id, child_id, quest_id, custom_description, stars, source, status, child_note, parent_response, created_by, reviewed_by, created_at, reviewed_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      (r->>'child_id')::UUID,
      (r->>'quest_id')::UUID,
      r->>'custom_description',
      (r->>'stars')::INTEGER,
      r->>'source',
      r->>'status',
      r->>'child_note',
      r->>'parent_response',
      (r->>'created_by')::UUID,
      (r->>'reviewed_by')::UUID,
      (r->>'created_at')::TIMESTAMPTZ,
      (r->>'reviewed_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- redemptions
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'redemptions';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO redemptions (id, family_id, child_id, reward_id, stars_spent, status, child_note, parent_response, uses_credit, credit_amount, created_at, reviewed_at, fulfilled_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      (r->>'child_id')::UUID,
      (r->>'reward_id')::UUID,
      (r->>'stars_spent')::INTEGER,
      r->>'status',
      r->>'child_note',
      r->>'parent_response',
      (r->>'uses_credit')::BOOLEAN,
      (r->>'credit_amount')::INTEGER,
      (r->>'created_at')::TIMESTAMPTZ,
      (r->>'reviewed_at')::TIMESTAMPTZ,
      (r->>'fulfilled_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- credit_interest_tiers
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'credit_interest_tiers';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO credit_interest_tiers (id, family_id, tier_order, min_debt, max_debt, interest_rate, created_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      (r->>'tier_order')::INTEGER,
      (r->>'min_debt')::INTEGER,
      (r->>'max_debt')::INTEGER,
      (r->>'interest_rate')::DECIMAL(5,4),
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- child_credit_settings
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'child_credit_settings';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO child_credit_settings (id, family_id, child_id, credit_limit, original_credit_limit, credit_enabled, created_at, updated_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      (r->>'child_id')::UUID,
      (r->>'credit_limit')::INTEGER,
      (r->>'original_credit_limit')::INTEGER,
      (r->>'credit_enabled')::BOOLEAN,
      (r->>'created_at')::TIMESTAMPTZ,
      (r->>'updated_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- credit_transactions
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'credit_transactions';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO credit_transactions (id, family_id, child_id, redemption_id, settlement_id, transaction_type, amount, balance_after, created_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      (r->>'child_id')::UUID,
      (r->>'redemption_id')::UUID,
      (r->>'settlement_id')::UUID,
      r->>'transaction_type',
      (r->>'amount')::INTEGER,
      (r->>'balance_after')::INTEGER,
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- credit_settlements
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'credit_settlements';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO credit_settlements (id, family_id, child_id, settlement_date, balance_before, debt_amount, interest_calculated, interest_breakdown, credit_limit_before, credit_limit_after, credit_limit_adjustment, settled_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      (r->>'child_id')::UUID,
      (r->>'settlement_date')::DATE,
      (r->>'balance_before')::INTEGER,
      (r->>'debt_amount')::INTEGER,
      (r->>'interest_calculated')::INTEGER,
      (r->'interest_breakdown')::JSONB,
      (r->>'credit_limit_before')::INTEGER,
      (r->>'credit_limit_after')::INTEGER,
      (r->>'credit_limit_adjustment')::INTEGER,
      (r->>'settled_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- family_report_preferences
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'family_report_preferences';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO family_report_preferences (id, family_id, report_email, weekly_report_enabled, monthly_report_enabled, settlement_email_enabled, timezone, report_locale, created_at, updated_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      r->>'report_email',
      (r->>'weekly_report_enabled')::BOOLEAN,
      (r->>'monthly_report_enabled')::BOOLEAN,
      (r->>'settlement_email_enabled')::BOOLEAN,
      r->>'timezone',
      r->>'report_locale',
      (r->>'created_at')::TIMESTAMPTZ,
      (r->>'updated_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- report_history
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'report_history';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO report_history (id, family_id, report_type, report_period_start, report_period_end, status, sent_to_email, report_data, error_message, sent_at, created_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      r->>'report_type',
      (r->>'report_period_start')::DATE,
      (r->>'report_period_end')::DATE,
      r->>'status',
      r->>'sent_to_email',
      (r->'report_data')::JSONB,
      r->>'error_message',
      (r->>'sent_at')::TIMESTAMPTZ,
      (r->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- family_invites
  SELECT rows INTO v_rows FROM demo_data_snapshot WHERE table_name = 'family_invites';
  FOR r IN SELECT jsonb_array_elements(v_rows)
  LOOP
    INSERT INTO family_invites (id, family_id, invite_code, created_by, status, used_by, expires_at, created_at, used_at)
    VALUES (
      (r->>'id')::UUID,
      (r->>'family_id')::UUID,
      r->>'invite_code',
      (r->>'created_by')::UUID,
      r->>'status',
      (r->>'used_by')::UUID,
      (r->>'expires_at')::TIMESTAMPTZ,
      (r->>'created_at')::TIMESTAMPTZ,
      (r->>'used_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- Re-enable trigger
  ALTER TABLE star_transactions ENABLE TRIGGER auto_repay_credit_on_star_transaction;
END;
$$;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION save_demo_snapshot(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION restore_demo_data() TO service_role;
