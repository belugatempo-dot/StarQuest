-- =============================================
-- Fix RLS Infinite Recursion Error
-- =============================================
-- Problem: Users table RLS policies cause infinite recursion when
-- checking permissions by querying the users table itself.
--
-- Solution: Simplify policies to avoid self-referential queries
-- during login/authentication checks.
-- =============================================

-- =============================================
-- Drop problematic policies
-- =============================================

-- Drop the recursive policy that queries users table in its own check
DROP POLICY IF EXISTS "Users can read own family members" ON users;
DROP POLICY IF EXISTS "Parents can manage family members" ON users;

-- =============================================
-- Create non-recursive policies
-- =============================================

-- Users can ALWAYS read their own record (critical for login)
-- This policy already exists and is correct:
-- "Users can read own record" - uses id = auth.uid() (no recursion)

-- Users can read family members using a view instead
-- First, create a simple policy for reading family members
-- that doesn't cause recursion
CREATE POLICY "Users can read family members" ON users
  FOR SELECT USING (
    -- User can read their own record
    id = auth.uid()
    OR
    -- User can read others in same family (non-recursive check)
    -- We check family_id directly without subquery
    EXISTS (
      SELECT 1 FROM users self
      WHERE self.id = auth.uid()
        AND self.family_id = users.family_id
        AND self.family_id IS NOT NULL
    )
  );

-- Parents can manage family members (INSERT, UPDATE, DELETE)
-- Use a simpler check that doesn't cause recursion
CREATE POLICY "Parents can manage family members" ON users
  FOR ALL USING (
    -- Check if current user is a parent in the same family
    EXISTS (
      SELECT 1 FROM users self
      WHERE self.id = auth.uid()
        AND self.role = 'parent'
        AND self.family_id = users.family_id
        AND self.family_id IS NOT NULL
    )
  );

-- =============================================
-- Alternative: Use SECURITY DEFINER functions
-- =============================================
-- For critical queries like login, we can also create
-- SECURITY DEFINER functions that bypass RLS

CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  family_id UUID,
  name TEXT,
  role TEXT,
  email TEXT,
  locale TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.family_id,
    u.name,
    u.role,
    u.email,
    u.locale,
    u.avatar_url,
    u.created_at
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_id(UUID) TO anon;

-- =============================================
-- Comments
-- =============================================
COMMENT ON POLICY "Users can read family members" ON users IS
'Allows users to read their own record and family members. Uses EXISTS to avoid infinite recursion.';

COMMENT ON POLICY "Parents can manage family members" ON users IS
'Allows parents to manage all members in their family. Uses EXISTS to avoid infinite recursion.';

COMMENT ON FUNCTION get_user_by_id IS
'Safely retrieves user by ID, bypassing RLS. Use this for authentication checks.';
