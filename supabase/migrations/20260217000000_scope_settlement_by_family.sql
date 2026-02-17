-- =============================================
-- Scope run_monthly_settlement by Family
-- Adds optional p_family_id parameter so the cron can call
-- the RPC once per family instead of globally.
-- When p_family_id IS NULL the function keeps its original
-- global behavior (backward compatible).
-- =============================================

CREATE OR REPLACE FUNCTION run_monthly_settlement(
  p_settlement_date DATE DEFAULT NULL,
  p_family_id UUID DEFAULT NULL
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

  -- Process each child with credit enabled, optionally scoped to one family
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
      AND (p_family_id IS NULL OR cb.family_id = p_family_id)
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

-- Grant execute to service_role for the updated function signature
GRANT EXECUTE ON FUNCTION run_monthly_settlement(DATE, UUID) TO service_role;
