-- Add family invites system for multi-parent support
--
-- This allows existing parents to invite additional parents to join their family
-- Flow:
-- 1. Parent A creates an invite code
-- 2. Parent B registers with the invite code
-- 3. Parent B joins the family automatically
--
-- =============================================

-- =============================================
-- TABLE: family_invites
-- =============================================
CREATE TABLE family_invites (
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

-- Index for fast lookup
CREATE INDEX idx_family_invites_code ON family_invites(invite_code);
CREATE INDEX idx_family_invites_family_id ON family_invites(family_id);
CREATE INDEX idx_family_invites_status ON family_invites(status);

-- =============================================
-- RLS POLICIES for family_invites
-- =============================================
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- Parents can view their family's invites
CREATE POLICY "Parents can view family invites" ON family_invites
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Parents can create invites for their family
CREATE POLICY "Parents can create family invites" ON family_invites
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Parents can update their family's invites (e.g., expire them)
CREATE POLICY "Parents can update family invites" ON family_invites
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Anyone can read active invites (needed for registration validation)
CREATE POLICY "Anyone can read active invites" ON family_invites
  FOR SELECT USING (status = 'active' AND expires_at > NOW());

-- =============================================
-- FUNCTION: Generate invite code
-- =============================================
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude ambiguous chars
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 8-character code
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Create family invite
-- =============================================
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

  -- Generate unique invite code (try up to 10 times)
  LOOP
    v_invite_code := generate_invite_code();
    v_attempt := v_attempt + 1;

    -- Try to insert
    BEGIN
      INSERT INTO family_invites (family_id, invite_code, created_by)
      VALUES (p_family_id, v_invite_code, auth.uid());

      RETURN v_invite_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= v_max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
      END IF;
      -- Continue loop to try again
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_family_invite(UUID) TO authenticated;

-- =============================================
-- FUNCTION: Validate and use invite code
-- =============================================
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

  -- If no rows returned, code is invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO authenticated;

-- =============================================
-- FUNCTION: Join family with invite code
-- =============================================
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
    -- Update existing user
    UPDATE users
    SET family_id = v_family_id,
        name = p_user_name,
        email = p_user_email,
        role = 'parent',
        locale = p_user_locale
    WHERE id = p_user_id;
  ELSE
    -- Create new user as parent
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

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE family_invites IS 'Stores invite codes for adding additional parents to families';
COMMENT ON FUNCTION create_family_invite IS 'Creates a new invite code for a family (8-character alphanumeric)';
COMMENT ON FUNCTION validate_invite_code IS 'Validates an invite code and returns family info if valid';
COMMENT ON FUNCTION join_family_with_invite IS 'Joins a family using an invite code during registration';
