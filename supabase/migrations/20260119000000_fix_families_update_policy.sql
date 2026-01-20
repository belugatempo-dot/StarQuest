-- =============================================
-- Fix families UPDATE policy + Add "Last day" support
-- =============================================

-- 1. Fix RLS policy - add WITH CHECK clause
DROP POLICY IF EXISTS "Parents can update own family" ON families;

CREATE POLICY "Parents can update own family" ON families
  FOR UPDATE
  USING (
    id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  )
  WITH CHECK (
    id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- 2. Update settlement_day constraint to allow 0 (meaning "last day of month")
-- First drop the existing constraint
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_settlement_day_check;

-- Add new constraint: 0 = last day, 1-28 = specific day
ALTER TABLE families ADD CONSTRAINT families_settlement_day_check
  CHECK (settlement_day >= 0 AND settlement_day <= 28);

-- Update comment
COMMENT ON COLUMN families.settlement_day IS 'Day of month for settlements: 0 = last day of month, 1-28 = specific day';

-- 3. Update get_families_due_for_settlement function to handle last day
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
  AND (
    -- Case 1: settlement_day = 0 means last day of month
    (COALESCE(f.settlement_day, 1) = 0
     AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')))
    OR
    -- Case 2: specific day (1-28)
    (COALESCE(f.settlement_day, 1) > 0
     AND EXTRACT(DAY FROM CURRENT_DATE) = COALESCE(f.settlement_day, 1))
  );
$$;

GRANT EXECUTE ON FUNCTION get_families_due_for_settlement() TO service_role;
