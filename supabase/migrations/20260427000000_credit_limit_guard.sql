-- Server-side validation for credit system
-- Accounts for pending redemptions to prevent over-committing

-- 1. Update record_credit_usage() with validation
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
  v_available_credit INTEGER;
  v_credit_enabled BOOLEAN;
  v_pending_credit INTEGER;
BEGIN
  -- Get family_id
  SELECT family_id INTO v_family_id
  FROM users WHERE id = p_child_id;

  -- Get current balance and credit info
  SELECT current_stars, available_credit, credit_enabled
  INTO v_balance, v_available_credit, v_credit_enabled
  FROM child_balances WHERE child_id = p_child_id;

  -- Validate: credit must be enabled
  IF NOT COALESCE(v_credit_enabled, false) THEN
    RAISE EXCEPTION 'Credit is not enabled for this child'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate: amount must be positive
  IF p_credit_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Account for credit already committed in OTHER pending redemptions
  -- (exclude the current redemption since it was just inserted)
  SELECT COALESCE(SUM(credit_amount), 0) INTO v_pending_credit
  FROM redemptions
  WHERE child_id = p_child_id
    AND status = 'pending'
    AND uses_credit = true
    AND id != p_redemption_id;

  -- Validate: requested amount must not exceed available credit minus pending
  IF p_credit_amount > (v_available_credit - v_pending_credit) THEN
    RAISE EXCEPTION 'Credit amount (%) exceeds available credit (% - % pending = %)',
      p_credit_amount, v_available_credit, v_pending_credit,
      v_available_credit - v_pending_credit
      USING ERRCODE = 'check_violation';
  END IF;

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

-- 2. Add trigger to validate redemption balance (pending-aware)
CREATE OR REPLACE FUNCTION validate_redemption_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_spendable INTEGER;
  v_pending_total INTEGER;
BEGIN
  -- Only validate for child-initiated redemptions (pending status)
  -- Parent-initiated (status='approved'/'fulfilled') bypass — parent has authority
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get child's spendable stars from the balance view
  SELECT spendable_stars INTO v_spendable
  FROM child_balances WHERE child_id = NEW.child_id;

  -- Default to 0 if no record
  v_spendable := COALESCE(v_spendable, 0);

  -- Sum of all OTHER pending redemptions for this child
  SELECT COALESCE(SUM(stars_spent), 0) INTO v_pending_total
  FROM redemptions
  WHERE child_id = NEW.child_id AND status = 'pending';

  -- Validate: total pending (existing + this new one) must not exceed spendable
  IF (v_pending_total + NEW.stars_spent) > v_spendable THEN
    RAISE EXCEPTION 'Insufficient stars: need % (% already pending + % new), have % spendable',
      v_pending_total + NEW.stars_spent, v_pending_total, NEW.stars_spent, v_spendable
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS check_redemption_balance ON redemptions;
CREATE TRIGGER check_redemption_balance
  BEFORE INSERT ON redemptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_redemption_balance();
