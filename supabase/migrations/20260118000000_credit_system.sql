-- =============================================
-- Credit System Migration
-- Adds credit/overdraft functionality for children
-- =============================================

-- =============================================
-- 1. TABLES
-- =============================================

-- Child credit settings - each child's credit configuration
CREATE TABLE IF NOT EXISTS child_credit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credit_limit INTEGER NOT NULL DEFAULT 0,
  original_credit_limit INTEGER NOT NULL DEFAULT 0,
  credit_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit interest tiers - family-customizable tiered interest rates
CREATE TABLE IF NOT EXISTS credit_interest_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  tier_order INTEGER NOT NULL,
  min_debt INTEGER NOT NULL,
  max_debt INTEGER, -- NULL means infinity
  interest_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.0500 = 5%
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, tier_order)
);

-- Credit settlements - monthly settlement records
CREATE TABLE IF NOT EXISTS credit_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  settlement_date DATE NOT NULL,
  balance_before INTEGER NOT NULL,
  debt_amount INTEGER NOT NULL,
  interest_calculated INTEGER NOT NULL,
  interest_breakdown JSONB, -- detailed breakdown of tiered interest
  credit_limit_before INTEGER NOT NULL,
  credit_limit_after INTEGER NOT NULL,
  credit_limit_adjustment INTEGER NOT NULL,
  settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, settlement_date)
);

-- Credit transactions - log of credit usage and repayments
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  redemption_id UUID REFERENCES redemptions(id) ON DELETE SET NULL,
  settlement_id UUID REFERENCES credit_settlements(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_used', 'credit_repaid', 'interest_charged')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL, -- child's balance after this transaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. MODIFY EXISTING TABLES
-- =============================================

-- Add credit-related columns to redemptions table
ALTER TABLE redemptions
ADD COLUMN IF NOT EXISTS uses_credit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_amount INTEGER DEFAULT 0;

-- =============================================
-- 3. INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_child_credit_settings_family ON child_credit_settings(family_id);
CREATE INDEX IF NOT EXISTS idx_child_credit_settings_child ON child_credit_settings(child_id);
CREATE INDEX IF NOT EXISTS idx_credit_interest_tiers_family ON credit_interest_tiers(family_id);
CREATE INDEX IF NOT EXISTS idx_credit_settlements_family ON credit_settlements(family_id);
CREATE INDEX IF NOT EXISTS idx_credit_settlements_child ON credit_settlements(child_id);
CREATE INDEX IF NOT EXISTS idx_credit_settlements_date ON credit_settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_family ON credit_transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_child ON credit_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- =============================================
-- 4. UPDATE child_balances VIEW
-- =============================================

DROP VIEW IF EXISTS child_balances;

CREATE VIEW child_balances AS
WITH base_balance AS (
  SELECT
    u.id AS child_id,
    u.family_id,
    u.name,
    -- Current available stars = approved earnings - approved/fulfilled redemptions
    COALESCE(SUM(st.stars) FILTER (WHERE st.status = 'approved'), 0)
      - COALESCE(
          (SELECT SUM(r.stars_spent)
           FROM redemptions r
           WHERE r.child_id = u.id AND r.status IN ('approved', 'fulfilled')),
          0
        ) AS current_stars,
    -- Lifetime stars (only positive approved transactions, for level calculation)
    COALESCE(SUM(st.stars) FILTER (WHERE st.status = 'approved' AND st.stars > 0), 0) AS lifetime_stars
  FROM users u
  LEFT JOIN star_transactions st ON st.child_id = u.id
  WHERE u.role = 'child'
  GROUP BY u.id, u.family_id, u.name
)
SELECT
  bb.child_id,
  bb.family_id,
  bb.name,
  bb.current_stars,
  bb.lifetime_stars,
  -- Credit fields
  COALESCE(ccs.credit_enabled, false) AS credit_enabled,
  COALESCE(ccs.credit_limit, 0) AS credit_limit,
  COALESCE(ccs.original_credit_limit, 0) AS original_credit_limit,
  -- Credit used (debt) = negative balance when balance < 0
  CASE WHEN bb.current_stars < 0 THEN ABS(bb.current_stars) ELSE 0 END AS credit_used,
  -- Available credit = credit_limit - credit_used (when enabled)
  CASE
    WHEN COALESCE(ccs.credit_enabled, false) = true
    THEN GREATEST(COALESCE(ccs.credit_limit, 0) - CASE WHEN bb.current_stars < 0 THEN ABS(bb.current_stars) ELSE 0 END, 0)
    ELSE 0
  END AS available_credit,
  -- Spendable stars = current_stars + available_credit (total amount child can spend)
  CASE
    WHEN COALESCE(ccs.credit_enabled, false) = true
    THEN GREATEST(bb.current_stars, 0) + GREATEST(COALESCE(ccs.credit_limit, 0) - CASE WHEN bb.current_stars < 0 THEN ABS(bb.current_stars) ELSE 0 END, 0)
    ELSE GREATEST(bb.current_stars, 0)
  END AS spendable_stars
FROM base_balance bb
LEFT JOIN child_credit_settings ccs ON ccs.child_id = bb.child_id;

-- Grant permissions
GRANT SELECT ON child_balances TO authenticated;
GRANT SELECT ON child_balances TO service_role;

-- =============================================
-- 5. RLS POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE child_credit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_interest_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- child_credit_settings policies
CREATE POLICY "Parents can view their family credit settings"
  ON child_credit_settings FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert credit settings for their family"
  ON child_credit_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Parents can update their family credit settings"
  ON child_credit_settings FOR UPDATE
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Parents can delete their family credit settings"
  ON child_credit_settings FOR DELETE
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- credit_interest_tiers policies
CREATE POLICY "Family members can view interest tiers"
  ON credit_interest_tiers FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert interest tiers"
  ON credit_interest_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Parents can update interest tiers"
  ON credit_interest_tiers FOR UPDATE
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Parents can delete interest tiers"
  ON credit_interest_tiers FOR DELETE
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- credit_settlements policies
CREATE POLICY "Family members can view settlements"
  ON credit_settlements FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert settlements"
  ON credit_settlements FOR INSERT
  TO service_role
  WITH CHECK (true);

-- credit_transactions policies
CREATE POLICY "Family members can view credit transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert credit transactions"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- 6. FUNCTIONS
-- =============================================

-- Function to calculate tiered interest
CREATE OR REPLACE FUNCTION calculate_tiered_interest(
  p_family_id UUID,
  p_debt_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier RECORD;
  v_remaining_debt INTEGER;
  v_tier_debt INTEGER;
  v_tier_interest DECIMAL;
  v_total_interest DECIMAL := 0;
  v_breakdown JSONB := '[]'::JSONB;
BEGIN
  -- If no debt, return 0
  IF p_debt_amount <= 0 THEN
    RETURN jsonb_build_object(
      'total_interest', 0,
      'breakdown', '[]'::JSONB
    );
  END IF;

  v_remaining_debt := p_debt_amount;

  -- Process each tier in order
  FOR v_tier IN
    SELECT * FROM credit_interest_tiers
    WHERE family_id = p_family_id
    ORDER BY tier_order ASC
  LOOP
    -- Calculate debt in this tier
    IF v_tier.max_debt IS NULL THEN
      -- Last tier (infinite max)
      v_tier_debt := GREATEST(v_remaining_debt - v_tier.min_debt, 0);
    ELSE
      -- Capped tier
      v_tier_debt := GREATEST(
        LEAST(v_remaining_debt, v_tier.max_debt) - v_tier.min_debt,
        0
      );
    END IF;

    IF v_tier_debt > 0 THEN
      v_tier_interest := CEIL(v_tier_debt * v_tier.interest_rate);
      v_total_interest := v_total_interest + v_tier_interest;

      v_breakdown := v_breakdown || jsonb_build_object(
        'tier_order', v_tier.tier_order,
        'min_debt', v_tier.min_debt,
        'max_debt', v_tier.max_debt,
        'debt_in_tier', v_tier_debt,
        'interest_rate', v_tier.interest_rate,
        'interest_amount', v_tier_interest
      );
    END IF;

    -- Check if we've accounted for all debt
    IF v_tier.max_debt IS NOT NULL AND v_remaining_debt <= v_tier.max_debt THEN
      EXIT;
    END IF;
  END LOOP;

  -- If no tiers configured, return 0 interest
  IF v_breakdown = '[]'::JSONB THEN
    RETURN jsonb_build_object(
      'total_interest', 0,
      'breakdown', '[]'::JSONB
    );
  END IF;

  RETURN jsonb_build_object(
    'total_interest', v_total_interest::INTEGER,
    'breakdown', v_breakdown
  );
END;
$$;

-- Function to run monthly settlement
CREATE OR REPLACE FUNCTION run_monthly_settlement(
  p_settlement_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settlement_date DATE;
  v_child RECORD;
  v_interest_result JSONB;
  v_total_interest INTEGER;
  v_new_credit_limit INTEGER;
  v_credit_adjustment INTEGER;
  v_balance INTEGER;
  v_debt INTEGER;
  v_processed_count INTEGER := 0;
  v_results JSONB := '[]'::JSONB;
BEGIN
  -- Default to first of current month
  v_settlement_date := COALESCE(p_settlement_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);

  -- Process each child with credit enabled
  FOR v_child IN
    SELECT
      cb.child_id,
      cb.family_id,
      cb.current_stars,
      cb.credit_limit,
      cb.original_credit_limit,
      cb.credit_enabled
    FROM child_balances cb
    WHERE cb.credit_enabled = true
  LOOP
    -- Check if already settled for this date
    IF EXISTS (
      SELECT 1 FROM credit_settlements
      WHERE child_id = v_child.child_id
      AND settlement_date = v_settlement_date
    ) THEN
      CONTINUE;
    END IF;

    -- Calculate debt (negative balance)
    v_balance := v_child.current_stars;
    v_debt := CASE WHEN v_balance < 0 THEN ABS(v_balance) ELSE 0 END;

    -- Calculate interest
    v_interest_result := calculate_tiered_interest(v_child.family_id, v_debt);
    v_total_interest := (v_interest_result->>'total_interest')::INTEGER;

    -- Calculate credit limit adjustment
    IF v_debt > 0 THEN
      -- Has debt: reduce credit limit by 20%
      v_credit_adjustment := -CEIL(v_child.credit_limit * 0.20);
      v_new_credit_limit := GREATEST(v_child.credit_limit + v_credit_adjustment, 0);
    ELSE
      -- No debt: restore 10% toward original limit
      v_credit_adjustment := CEIL((v_child.original_credit_limit - v_child.credit_limit) * 0.10);
      v_new_credit_limit := LEAST(v_child.credit_limit + v_credit_adjustment, v_child.original_credit_limit);
    END IF;

    -- Insert settlement record
    INSERT INTO credit_settlements (
      family_id,
      child_id,
      settlement_date,
      balance_before,
      debt_amount,
      interest_calculated,
      interest_breakdown,
      credit_limit_before,
      credit_limit_after,
      credit_limit_adjustment
    ) VALUES (
      v_child.family_id,
      v_child.child_id,
      v_settlement_date,
      v_balance,
      v_debt,
      v_total_interest,
      v_interest_result->'breakdown',
      v_child.credit_limit,
      v_new_credit_limit,
      v_new_credit_limit - v_child.credit_limit
    );

    -- Update credit limit
    UPDATE child_credit_settings
    SET
      credit_limit = v_new_credit_limit,
      updated_at = NOW()
    WHERE child_id = v_child.child_id;

    -- If interest > 0, create interest transaction (deducts from balance)
    IF v_total_interest > 0 THEN
      -- Create star_transaction for interest charge
      INSERT INTO star_transactions (
        family_id,
        child_id,
        quest_id,
        custom_description,
        stars,
        source,
        status,
        parent_response,
        created_by,
        reviewed_by
      ) VALUES (
        v_child.family_id,
        v_child.child_id,
        NULL,
        'Monthly credit interest charge',
        -v_total_interest,
        'parent_record',
        'approved',
        'Automatic interest on credit balance',
        v_child.child_id, -- system
        v_child.child_id  -- system
      );

      -- Record credit transaction
      INSERT INTO credit_transactions (
        family_id,
        child_id,
        settlement_id,
        transaction_type,
        amount,
        balance_after
      ) VALUES (
        v_child.family_id,
        v_child.child_id,
        (SELECT id FROM credit_settlements
         WHERE child_id = v_child.child_id
         AND settlement_date = v_settlement_date),
        'interest_charged',
        v_total_interest,
        v_balance - v_total_interest
      );
    END IF;

    v_processed_count := v_processed_count + 1;
    v_results := v_results || jsonb_build_object(
      'child_id', v_child.child_id,
      'debt', v_debt,
      'interest', v_total_interest,
      'old_limit', v_child.credit_limit,
      'new_limit', v_new_credit_limit
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'settlement_date', v_settlement_date,
    'processed_count', v_processed_count,
    'results', v_results
  );
END;
$$;

-- Function to record credit usage when redemption uses credit
CREATE OR REPLACE FUNCTION record_credit_usage(
  p_child_id UUID,
  p_redemption_id UUID,
  p_credit_amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id UUID;
  v_balance INTEGER;
BEGIN
  -- Get family_id
  SELECT family_id INTO v_family_id
  FROM users WHERE id = p_child_id;

  -- Get current balance after this redemption
  SELECT current_stars INTO v_balance
  FROM child_balances WHERE child_id = p_child_id;

  -- Insert credit transaction
  INSERT INTO credit_transactions (
    family_id,
    child_id,
    redemption_id,
    transaction_type,
    amount,
    balance_after
  ) VALUES (
    v_family_id,
    p_child_id,
    p_redemption_id,
    'credit_used',
    p_credit_amount,
    v_balance
  );

  RETURN true;
END;
$$;

-- Function to initialize default interest tiers for a family
CREATE OR REPLACE FUNCTION initialize_default_interest_tiers(
  p_family_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only insert if no tiers exist
  IF NOT EXISTS (SELECT 1 FROM credit_interest_tiers WHERE family_id = p_family_id) THEN
    INSERT INTO credit_interest_tiers (family_id, tier_order, min_debt, max_debt, interest_rate)
    VALUES
      (p_family_id, 1, 0, 19, 0.0500),   -- 0-19 stars: 5%
      (p_family_id, 2, 20, 49, 0.1000),  -- 20-49 stars: 10%
      (p_family_id, 3, 50, NULL, 0.1500); -- 50+ stars: 15%
  END IF;

  RETURN true;
END;
$$;

-- Function to get or create credit settings for a child
CREATE OR REPLACE FUNCTION get_or_create_credit_settings(
  p_child_id UUID,
  p_family_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  -- Check if settings exist
  SELECT id INTO v_settings_id
  FROM child_credit_settings
  WHERE child_id = p_child_id;

  -- Create if not exists
  IF v_settings_id IS NULL THEN
    INSERT INTO child_credit_settings (family_id, child_id)
    VALUES (p_family_id, p_child_id)
    RETURNING id INTO v_settings_id;
  END IF;

  RETURN v_settings_id;
END;
$$;

-- =============================================
-- 7. TRIGGERS
-- =============================================

-- Trigger to auto-repay credit when earning stars
CREATE OR REPLACE FUNCTION trigger_auto_repay_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_repayment INTEGER;
BEGIN
  -- Only process approved positive star transactions
  IF NEW.status = 'approved' AND NEW.stars > 0 AND
     (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'approved')) THEN

    -- Check if child has credit enabled and negative balance
    SELECT cb.current_stars INTO v_balance_before
    FROM child_balances cb
    JOIN child_credit_settings ccs ON ccs.child_id = cb.child_id
    WHERE cb.child_id = NEW.child_id
    AND ccs.credit_enabled = true;

    -- If child has credit enabled
    IF v_balance_before IS NOT NULL THEN
      -- Balance before this transaction
      v_balance_before := v_balance_before - NEW.stars; -- subtract because view already includes it

      -- If there was debt before
      IF v_balance_before < 0 THEN
        -- Calculate repayment (minimum of stars earned and debt amount)
        v_repayment := LEAST(NEW.stars, ABS(v_balance_before));

        IF v_repayment > 0 THEN
          -- Record credit repayment transaction
          INSERT INTO credit_transactions (
            family_id,
            child_id,
            transaction_type,
            amount,
            balance_after
          ) VALUES (
            NEW.family_id,
            NEW.child_id,
            'credit_repaid',
            v_repayment,
            v_balance_before + NEW.stars
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_repay_credit_on_star_transaction
  AFTER INSERT OR UPDATE ON star_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_repay_credit();

-- Update timestamp trigger for credit settings
CREATE OR REPLACE FUNCTION update_credit_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_credit_settings_updated_at
  BEFORE UPDATE ON child_credit_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_settings_timestamp();

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON child_credit_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_interest_tiers TO authenticated;
GRANT SELECT ON credit_settlements TO authenticated;
GRANT SELECT, INSERT ON credit_transactions TO authenticated;

GRANT ALL ON child_credit_settings TO service_role;
GRANT ALL ON credit_interest_tiers TO service_role;
GRANT ALL ON credit_settlements TO service_role;
GRANT ALL ON credit_transactions TO service_role;

GRANT EXECUTE ON FUNCTION calculate_tiered_interest(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_tiered_interest(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION run_monthly_settlement(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION record_credit_usage(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_default_interest_tiers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_credit_settings(UUID, UUID) TO authenticated;
