-- =============================================
-- FIX: child_balances view should only count approved transactions
-- Issue: Pending transactions were incorrectly affecting star balance
-- =============================================

-- Drop and recreate the view to ensure correct definition
DROP VIEW IF EXISTS child_balances;

CREATE VIEW child_balances AS
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
GROUP BY u.id, u.family_id, u.name;

-- Grant permissions
GRANT SELECT ON child_balances TO authenticated;
GRANT SELECT ON child_balances TO service_role;
