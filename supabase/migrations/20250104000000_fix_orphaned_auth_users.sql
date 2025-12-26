-- =============================================
-- Fix Orphaned Auth Users - Comprehensive Solution
-- =============================================
-- This migration makes registration resilient to failures by:
-- 1. Automatically healing orphaned auth.users records
-- 2. Making create_family_with_templates idempotent
-- 3. Distinguishing between same-user retries and true email conflicts
-- =============================================

-- =============================================
-- Enhanced create_family_with_templates Function
-- =============================================
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
  v_existing_user_id UUID;
  v_auth_user_email TEXT;
BEGIN
  -- ============================================
  -- STEP 1: Check if user already exists by ID
  -- ============================================
  SELECT family_id INTO v_existing_family_id
  FROM users
  WHERE id = p_user_id;

  -- If user exists and has a family, return it (idempotent)
  IF v_existing_family_id IS NOT NULL THEN
    RAISE NOTICE 'User % already has family %, returning existing family', p_user_id, v_existing_family_id;
    RETURN v_existing_family_id;
  END IF;

  -- ============================================
  -- STEP 2: Check for email conflicts
  -- ============================================
  -- Find if this email belongs to a DIFFERENT user
  SELECT id INTO v_existing_user_id
  FROM users
  WHERE email = p_user_email AND id != p_user_id;

  IF v_existing_user_id IS NOT NULL THEN
    -- True conflict: email belongs to a different user
    RAISE EXCEPTION 'Email % is already registered to a different account. Please use a different email or try logging in.', p_user_email
      USING HINT = 'If you previously registered with this email, use the login page instead.';
  END IF;

  -- ============================================
  -- STEP 3: Check if this is an orphaned auth user
  -- ============================================
  -- Query auth.users to see if this user_id exists there with this email
  SELECT email INTO v_auth_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_auth_user_email IS NOT NULL AND v_auth_user_email = p_user_email THEN
    -- This is a valid retry: auth user exists, public user might be orphaned
    RAISE NOTICE 'Detected orphaned auth user %, email %. Healing...', p_user_id, p_user_email;

    -- Clean up any orphaned public.users record for this user_id
    DELETE FROM users WHERE id = p_user_id;
  END IF;

  -- ============================================
  -- STEP 4: Check if user exists but has no family (orphaned public user)
  -- ============================================
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE NOTICE 'User % exists but has no family. Creating family and updating user...', p_user_id;

    -- Create family
    INSERT INTO families (name) VALUES (p_family_name)
    RETURNING id INTO v_family_id;

    -- Update existing user record
    UPDATE users
    SET family_id = v_family_id,
        name = p_user_name,
        email = p_user_email,
        role = 'parent',
        locale = p_user_locale
    WHERE id = p_user_id;
  ELSE
    -- ============================================
    -- STEP 5: Create new family and user
    -- ============================================
    RAISE NOTICE 'Creating new family and user for %', p_user_email;

    -- Create family
    INSERT INTO families (name) VALUES (p_family_name)
    RETURNING id INTO v_family_id;

    -- Create user
    INSERT INTO users (id, family_id, name, email, role, locale)
    VALUES (p_user_id, v_family_id, p_user_name, p_user_email, 'parent', p_user_locale);
  END IF;

  -- ============================================
  -- STEP 6: Initialize templates
  -- ============================================
  PERFORM initialize_family_templates(v_family_id);

  RAISE NOTICE 'Successfully created/updated family % for user %', v_family_id, p_user_id;
  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;

-- =============================================
-- Enhanced join_family_with_invite Function
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
  v_existing_user_id UUID;
  v_existing_family_id UUID;
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

  -- Check if user already has a family
  SELECT family_id INTO v_existing_family_id
  FROM users
  WHERE id = p_user_id;

  IF v_existing_family_id IS NOT NULL THEN
    IF v_existing_family_id = v_family_id THEN
      -- User already in this family, return it (idempotent)
      RAISE NOTICE 'User % already in family %, returning', p_user_id, v_family_id;
      RETURN v_family_id;
    ELSE
      -- User belongs to different family
      RAISE EXCEPTION 'You are already a member of another family. Each user can only belong to one family.';
    END IF;
  END IF;

  -- Check if email belongs to a DIFFERENT user
  SELECT id INTO v_existing_user_id
  FROM users
  WHERE email = p_user_email AND id != p_user_id;

  IF v_existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Email % is already registered to a different account. Please use a different email.', p_user_email;
  END IF;

  -- Check if user exists by ID (orphaned record) or needs to be created
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    -- Update existing user to join family
    RAISE NOTICE 'User % exists, updating to join family %', p_user_id, v_family_id;
    UPDATE users
    SET family_id = v_family_id,
        name = p_user_name,
        email = p_user_email,
        role = 'parent',
        locale = p_user_locale
    WHERE id = p_user_id;
  ELSE
    -- Create new user as parent
    RAISE NOTICE 'Creating new user % to join family %', p_user_id, v_family_id;
    INSERT INTO users (id, family_id, name, email, role, locale)
    VALUES (p_user_id, v_family_id, p_user_name, p_user_email, 'parent', p_user_locale);
  END IF;

  -- Mark invite as used
  UPDATE family_invites
  SET status = 'used',
      used_by = p_user_id,
      used_at = NOW()
  WHERE id = v_invite_id;

  RAISE NOTICE 'Successfully joined family % with user %', v_family_id, p_user_id;
  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION join_family_with_invite(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION join_family_with_invite(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================
-- Comments
-- =============================================
COMMENT ON FUNCTION create_family_with_templates IS
'Creates a new family with templates. Automatically heals orphaned auth users. Idempotent - safe to call multiple times with same parameters.';

COMMENT ON FUNCTION join_family_with_invite IS
'Joins an existing family using an invite code. Handles orphaned auth users gracefully. Idempotent.';
