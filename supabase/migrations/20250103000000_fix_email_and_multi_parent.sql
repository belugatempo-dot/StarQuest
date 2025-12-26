-- Fix email constraint and support multi-parent families
--
-- Problem 1: Email unique constraint prevents re-registration when auth user exists but users record is orphaned
-- Problem 2: No mechanism for multiple parents to join the same family
--
-- Solution:
-- 1. Update create_family_with_templates to check email existence and handle gracefully
-- 2. Keep email UNIQUE (one account per email is correct)
-- 3. Add invite mechanism for adding additional parents to existing families (future enhancement)

-- =============================================
-- Fix create_family_with_templates function
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
  -- This handles the case where auth user was created but users record exists from previous attempt
  SELECT id INTO v_existing_user_by_email
  FROM users
  WHERE email = p_user_email AND id != p_user_id;

  -- If email exists for a DIFFERENT user ID, this is a conflict
  -- The auth user should have been cleaned up, but wasn't
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
    -- Delete the orphaned record and recreate
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;

-- =============================================
-- Add function to invite additional parent to existing family
-- =============================================
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_parent_to_family(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================
-- Comments for future development
-- =============================================
COMMENT ON FUNCTION add_parent_to_family IS
'Allows an existing parent to add another parent to their family.
Usage: Second parent creates auth account, then first parent invites them via invite code or email.
Future: Implement invite codes/links in the UI.';
