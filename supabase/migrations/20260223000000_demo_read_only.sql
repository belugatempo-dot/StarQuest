-- Demo Read-Only Mode: add is_demo flag + helper function + updated RLS policies.
-- Demo users can read everything but write nothing. Enforced at the database level.

-- 1. Add is_demo column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- 2. Helper function: checks if a user is a demo account (STABLE = cached per statement)
CREATE OR REPLACE FUNCTION is_demo_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_demo FROM users WHERE id = p_user_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION is_demo_user(UUID) TO authenticated;

-- 3. Update write policies to block demo users
-- Pattern: drop + recreate with `AND NOT is_demo_user(auth.uid())`
-- SELECT policies are left unchanged (demo users CAN read)

-- ═══════════════════════════════════════════════
-- star_transactions
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents full access to transactions" ON star_transactions;
CREATE POLICY "Parents full access to transactions" ON star_transactions
  FOR ALL USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  )
  WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Children create own requests" ON star_transactions;
CREATE POLICY "Children create own requests" ON star_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'child')
    AND child_id = auth.uid()
    AND source = 'child_request'
    AND status = 'pending'
    AND stars > 0
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- redemptions
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents full access to redemptions" ON redemptions;
CREATE POLICY "Parents full access to redemptions" ON redemptions
  FOR ALL USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  )
  WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Children create own redemptions" ON redemptions;
CREATE POLICY "Children create own redemptions" ON redemptions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'child')
    AND child_id = auth.uid()
    AND status = 'pending'
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- quests
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents full access to quests" ON quests;
CREATE POLICY "Parents full access to quests" ON quests
  FOR ALL USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  )
  WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- rewards
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents full access to rewards" ON rewards;
CREATE POLICY "Parents full access to rewards" ON rewards
  FOR ALL USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  )
  WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- levels
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents full access to levels" ON levels;
CREATE POLICY "Parents full access to levels" ON levels
  FOR ALL USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  )
  WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- quest_categories
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents can insert categories" ON quest_categories;
CREATE POLICY "Parents can insert categories" ON quest_categories
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can update categories" ON quest_categories;
CREATE POLICY "Parents can update categories" ON quest_categories
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can delete categories" ON quest_categories;
CREATE POLICY "Parents can delete categories" ON quest_categories
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- child_credit_settings
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents can insert credit settings for their family" ON child_credit_settings;
CREATE POLICY "Parents can insert credit settings for their family" ON child_credit_settings
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can update their family credit settings" ON child_credit_settings;
CREATE POLICY "Parents can update their family credit settings" ON child_credit_settings
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can delete their family credit settings" ON child_credit_settings;
CREATE POLICY "Parents can delete their family credit settings" ON child_credit_settings
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- credit_interest_tiers
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents can insert interest tiers" ON credit_interest_tiers;
CREATE POLICY "Parents can insert interest tiers" ON credit_interest_tiers
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can update interest tiers" ON credit_interest_tiers;
CREATE POLICY "Parents can update interest tiers" ON credit_interest_tiers
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can delete interest tiers" ON credit_interest_tiers;
CREATE POLICY "Parents can delete interest tiers" ON credit_interest_tiers
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- credit_transactions
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "System can insert credit transactions" ON credit_transactions;
CREATE POLICY "System can insert credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    AND NOT is_demo_user(auth.uid())
  );

-- ═══════════════════════════════════════════════
-- family_report_preferences
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents can insert own family report preferences" ON family_report_preferences;
CREATE POLICY "Parents can insert own family report preferences" ON family_report_preferences
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can update own family report preferences" ON family_report_preferences;
CREATE POLICY "Parents can update own family report preferences" ON family_report_preferences
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
    AND NOT is_demo_user(auth.uid())
  );

-- Note: credit_settlements only has a service_role INSERT policy — no authenticated user
-- writes, so no change needed there. Same for report_history.
