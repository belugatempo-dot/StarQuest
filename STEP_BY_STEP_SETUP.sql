-- =============================================
-- STEP BY STEP SETUP - Run each section separately
-- =============================================

-- =============================================
-- STEP 1: Clear ALL data (including auth.users)
-- =============================================
-- IMPORTANT: Run this first!
-- Copy and run this section in Supabase SQL Editor

-- Clear app tables first
DELETE FROM redemptions;
DELETE FROM star_transactions;
DELETE FROM levels;
DELETE FROM rewards;
DELETE FROM quests;
DELETE FROM users;
DELETE FROM families;

-- Clear auth users (THIS IS CRITICAL!)
DELETE FROM auth.users;

-- Verify everything is empty
SELECT 'families' as table_name, COUNT(*) as count FROM families
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users;

-- Expected result: All counts should be 0

-- =============================================
-- STEP 2: Apply Migration 1 (Fix Email)
-- =============================================
-- Copy and run this section after Step 1

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

  IF v_existing_family_id IS NOT NULL THEN
    RETURN v_existing_family_id;
  END IF;

  -- Check if email already exists (different user ID)
  SELECT id INTO v_existing_user_by_email
  FROM users
  WHERE email = p_user_email AND id != p_user_id;

  IF v_existing_user_by_email IS NOT NULL THEN
    RAISE EXCEPTION 'Email % is already registered. Please use a different email or contact support.', p_user_email
      USING HINT = 'If you previously registered with this email, please try logging in instead.';
  END IF;

  -- Check if user exists by ID but has no family
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
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
    -- Delete any orphaned record
    DELETE FROM users WHERE email = p_user_email AND id = p_user_id;

    -- Create new family and user
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

-- =============================================
-- STEP 3: Apply Migration 2 (Family Invites)
-- =============================================
-- Copy and run this section after Step 2

-- Create table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_invites_code ON family_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_family_invites_family_id ON family_invites(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_status ON family_invites(status);

-- Enable RLS
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Parents can view family invites" ON family_invites;
CREATE POLICY "Parents can view family invites" ON family_invites
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
  );

DROP POLICY IF EXISTS "Parents can create family invites" ON family_invites;
CREATE POLICY "Parents can create family invites" ON family_invites
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
  );

DROP POLICY IF EXISTS "Parents can update family invites" ON family_invites;
CREATE POLICY "Parents can update family invites" ON family_invites
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent')
  );

DROP POLICY IF EXISTS "Anyone can read active invites" ON family_invites;
CREATE POLICY "Anyone can read active invites" ON family_invites
  FOR SELECT USING (status = 'active' AND expires_at > NOW());

-- Create functions
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

CREATE OR REPLACE FUNCTION create_family_invite(p_family_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_invite_code TEXT;
  v_user_role TEXT;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  SELECT role INTO v_user_role FROM users WHERE id = auth.uid() AND family_id = p_family_id;

  IF v_user_role != 'parent' THEN
    RAISE EXCEPTION 'Only parents can create family invites';
  END IF;

  LOOP
    v_invite_code := generate_invite_code();
    v_attempt := v_attempt + 1;

    BEGIN
      INSERT INTO family_invites (family_id, invite_code, created_by)
      VALUES (p_family_id, v_invite_code, auth.uid());
      RETURN v_invite_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= v_max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique invite code';
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_family_invite(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION validate_invite_code(p_invite_code TEXT)
RETURNS TABLE(is_valid BOOLEAN, family_id UUID, family_name TEXT, invite_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE, fi.family_id, f.name, fi.id
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
  SELECT id, family_id INTO v_invite_id, v_family_id
  FROM family_invites
  WHERE invite_code = UPPER(p_invite_code) AND status = 'active' AND expires_at > NOW();

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  SELECT id INTO v_existing_user_by_email
  FROM users WHERE email = p_user_email AND id != p_user_id;

  IF v_existing_user_by_email IS NOT NULL THEN
    RAISE EXCEPTION 'Email % is already registered. Please use a different email.', p_user_email;
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    UPDATE users SET family_id = v_family_id, name = p_user_name, email = p_user_email, role = 'parent', locale = p_user_locale
    WHERE id = p_user_id;
  ELSE
    INSERT INTO users (id, family_id, name, email, role, locale)
    VALUES (p_user_id, v_family_id, p_user_name, p_user_email, 'parent', p_user_locale);
  END IF;

  UPDATE family_invites SET status = 'used', used_by = p_user_id, used_at = NOW() WHERE id = v_invite_id;

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_family_with_invite(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION join_family_with_invite(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Done!
SELECT 'Setup complete! ✅' as status;
