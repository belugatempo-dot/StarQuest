-- =============================================
-- Settlement Day Configuration Migration
-- Allows families to configure which day of month settlements occur
-- =============================================

-- Add settlement_day column to families table
ALTER TABLE families
ADD COLUMN IF NOT EXISTS settlement_day INTEGER DEFAULT 1 CHECK (settlement_day >= 1 AND settlement_day <= 28);

-- Comment explaining the column
COMMENT ON COLUMN families.settlement_day IS 'Day of month (1-28) when credit settlements are processed. Defaults to 1st.';

-- Update run_monthly_settlement function to use family-specific settlement day
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
  -- Default to first of current month (can be overridden)
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

-- Function to get families that need settlement today
CREATE OR REPLACE FUNCTION get_families_due_for_settlement()
RETURNS TABLE (
  family_id UUID,
  settlement_day INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT f.id, COALESCE(f.settlement_day, 1)
  FROM families f
  WHERE EXISTS (
    SELECT 1 FROM child_credit_settings ccs
    WHERE ccs.family_id = f.id
    AND ccs.credit_enabled = true
  )
  AND EXTRACT(DAY FROM CURRENT_DATE) = COALESCE(f.settlement_day, 1);
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_families_due_for_settlement() TO service_role;
