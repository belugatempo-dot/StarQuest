-- =============================================
-- COMPLETE SETUP SCRIPT
-- =============================================
-- This script will:
-- 1. Clear all existing data
-- 2. Apply migration 1 (fix_email_and_multi_parent)
-- 3. Apply migration 2 (add_family_invites)
--
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- =============================================
-- STEP 1: Clear existing data
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '🗑️  Clearing existing data...';
END $$;

-- Delete in reverse dependency order
DELETE FROM redemptions;
DELETE FROM star_transactions;
DELETE FROM levels;
DELETE FROM rewards;
DELETE FROM quests;
DELETE FROM users WHERE role = 'child';
DELETE FROM users WHERE role = 'parent';
DELETE FROM families;

-- Also need to clear auth.users (requires elevated privileges)
DELETE FROM auth.users;

DO $$
BEGIN
  RAISE NOTICE '✅ Data cleared successfully!';
  RAISE NOTICE '';
END $$;

-- =============================================
-- STEP 2: Apply Migration 1 - Fix email and multi-parent
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '📦 Applying migration 1: fix_email_and_multi_parent...';
END $$;

CREATE OR REPLACE FUNCTION create_family_with_templates(
  p_family_name TEXT,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_email TEXT,
  p_user_locale TEXT DEFAULT 'en'
)
RETURNS UUID AS $$
DECLARE
  v_family_id UUID;
  v_existing_family_id UUID;
  v_existing_user_by_email UUID;
BEGIN
  -- Check if user already exists by ID and has a family
  SELECT family_id INTO v_existing_family_id
  FROM users
  WHERE id = p_user_id;

  -- If user already has a family, return it
  IF v_existing_family_id IS NOT NULL THEN
    RETURN v_existing_family_id;
  END IF;

  -- Check if email already exists (different user ID, same email)
  SELECT id INTO v_existing_user_by_email
  FROM users
  WHERE email = p_user_email AND id != p_user_id;

  -- If email exists for a DIFFERENT user ID, this is a conflict
  IF v_existing_user_by_email IS NOT NULL THEN
    RAISE EXCEPTION 'Email % is already registered. Please use a different email or contact support.', p_user_email
      USING HINT = 'If you previously registered with this email, please try logging in instead.';
  END IF;

  -- Check if user exists by ID but has no family (orphaned user record)
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    -- User exists, just create family and update user
    INSERT INTO families (name) VALUES (p_family_name)
    RETURNING id INTO v_family_id;

    UPDATE users
    SET family_id = v_family_id,
        name = p_user_name,
        email = p_user_email,
        role = 'parent',
        locale = p_user_locale
    WHERE id = p_user_id;
  ELSE
    -- Check one more time if email exists (same user ID, orphaned record)
    DELETE FROM users WHERE email = p_user_email AND id = p_user_id;

    -- New user, create everything
    INSERT INTO families (name) VALUES (p_family_name)
    RETURNING id INTO v_family_id;

    INSERT INTO users (id, family_id, name, email, role, locale)
    VALUES (p_user_id, v_family_id, p_user_name, p_user_email, 'parent', p_user_locale);
  END IF;

  -- Initialize templates
  PERFORM initialize_family_templates(v_family_id);

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;

-- Add function to invite additional parent to existing family
CREATE OR REPLACE FUNCTION add_parent_to_family(
  p_family_id UUID,
  p_parent_id UUID,
  p_parent_name TEXT,
  p_parent_email TEXT,
  p_parent_locale TEXT DEFAULT 'en'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_requesting_user_role TEXT;
BEGIN
  -- Verify requesting user is a parent in the family
  SELECT role INTO v_requesting_user_role
  FROM users
  WHERE id = auth.uid() AND family_id = p_family_id;

  IF v_requesting_user_role != 'parent' THEN
    RAISE EXCEPTION 'Only parents can add other parents to the family';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM users WHERE email = p_parent_email) THEN
    RAISE EXCEPTION 'Email % is already registered. Each parent must have a unique email.', p_parent_email;
  END IF;

  -- Add the new parent
  INSERT INTO users (id, family_id, name, email, role, locale)
  VALUES (p_parent_id, p_family_id, p_parent_name, p_parent_email, 'parent', p_parent_locale);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_parent_to_family(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION add_parent_to_family IS
'Allows an existing parent to add another parent to their family.
Usage: Second parent creates auth account, then first parent invites them via invite code or email.';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 1 applied successfully!';
  RAISE NOTICE '';
END $$;

-- =============================================
-- STEP 3: Apply Migration 2 - Add family invites
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '📦 Applying migration 2: add_family_invites...';
END $$;

-- Create family_invites table
CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_family_invites_code ON family_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_family_invites_family_id ON family_invites(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_status ON family_invites(status);

-- Enable RLS
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Parents can view family invites" ON family_invites;
CREATE POLICY "Parents can view family invites" ON family_invites
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

DROP POLICY IF EXISTS "Parents can create family invites" ON family_invites;
CREATE POLICY "Parents can create family invites" ON family_invites
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

DROP POLICY IF EXISTS "Parents can update family invites" ON family_invites;
CREATE POLICY "Parents can update family invites" ON family_invites
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

DROP POLICY IF EXISTS "Anyone can read active invites" ON family_invites;
CREATE POLICY "Anyone can read active invites" ON family_invites
  FOR SELECT USING (status = 'active' AND expires_at > NOW());

-- Generate invite code function
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create family invite function
CREATE OR REPLACE FUNCTION create_family_invite(
  p_family_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_invite_code TEXT;
  v_user_role TEXT;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  -- Verify requesting user is a parent in the family
  SELECT role INTO v_user_role
  FROM users
  WHERE id = auth.uid() AND family_id = p_family_id;

  IF v_user_role != 'parent' THEN
    RAISE EXCEPTION 'Only parents can create family invites';
  END IF;

  -- Generate unique invite code
  LOOP
    v_invite_code := generate_invite_code();
    v_attempt := v_attempt + 1;

    BEGIN
      INSERT INTO family_invites (family_id, invite_code, created_by)
      VALUES (p_family_id, v_invite_code, auth.uid());

      RETURN v_invite_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= v_max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_family_invite(UUID) TO authenticated;

-- Validate invite code function
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_invite_code TEXT
)
RETURNS TABLE(
  is_valid BOOLEAN,
  family_id UUID,
  family_name TEXT,
  invite_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_valid,
    fi.family_id,
    f.name as family_name,
    fi.id as invite_id
  FROM family_invites fi
  JOIN families f ON f.id = fi.family_id
  WHERE fi.invite_code = UPPER(p_invite_code)
    AND fi.status = 'active'
    AND fi.expires_at > NOW()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO authenticated;

-- Join family with invite code function
CREATE OR REPLACE FUNCTION join_family_with_invite(
  p_invite_code TEXT,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_email TEXT,
  p_user_locale TEXT DEFAULT 'en'
)
RETURNS UUID AS $$
DECLARE
  v_invite_id UUID;
  v_family_id UUID;
  v_existing_user_by_email UUID;
BEGIN
  -- Validate invite code
  SELECT id, family_id INTO v_invite_id, v_family_id
  FROM family_invites
  WHERE invite_code = UPPER(p_invite_code)
    AND status = 'active'
    AND expires_at > NOW();

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Check if user already exists with this email (different ID)
  SELECT id INTO v_existing_user_by_email
  FROM users
  WHERE email = p_user_email AND id != p_user_id;

  IF v_existing_user_by_email IS NOT NULL THEN
    RAISE EXCEPTION 'Email % is already registered. Please use a different email.', p_user_email;
  END IF;

  -- Check if user already exists by ID
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    UPDATE users
    SET family_id = v_family_id,
        name = p_user_name,
        email = p_user_email,
        role = 'parent',
        locale = p_user_locale
    WHERE id = p_user_id;
  ELSE
    INSERT INTO users (id, family_id, name, email, role, locale)
    VALUES (p_user_id, v_family_id, p_user_name, p_user_email, 'parent', p_user_locale);
  END IF;

  -- Mark invite as used
  UPDATE family_invites
  SET status = 'used',
      used_by = p_user_id,
      used_at = NOW()
  WHERE id = v_invite_id;

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_family_with_invite(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION join_family_with_invite(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE family_invites IS 'Stores invite codes for adding additional parents to families';
COMMENT ON FUNCTION create_family_invite IS 'Creates a new invite code for a family (8-character alphanumeric)';
COMMENT ON FUNCTION validate_invite_code IS 'Validates an invite code and returns family info if valid';
COMMENT ON FUNCTION join_family_with_invite IS 'Joins a family using an invite code during registration';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 2 applied successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 All migrations applied successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '  - Cleared all existing data';
  RAISE NOTICE '  - Fixed email constraint handling';
  RAISE NOTICE '  - Added multi-parent support';
  RAISE NOTICE '  - Created family_invites table';
  RAISE NOTICE '  - Added invite code functions';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready to test!';
END $$;
