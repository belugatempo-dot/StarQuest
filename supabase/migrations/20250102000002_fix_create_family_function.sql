-- Fix create_family_with_templates to handle duplicate user IDs
-- This prevents the "duplicate key value violates unique constraint" error

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
BEGIN
  -- Check if user already exists and has a family
  SELECT family_id INTO v_existing_family_id
  FROM users
  WHERE id = p_user_id;

  -- If user already has a family, return it
  IF v_existing_family_id IS NOT NULL THEN
    RETURN v_existing_family_id;
  END IF;

  -- Check if user exists but has no family (edge case)
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
