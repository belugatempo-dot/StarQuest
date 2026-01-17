-- Function to update child email
-- Parents can update their children's email in auth.users

-- =============================================
-- FUNCTION: admin_update_child_email
-- Update a child's email (parent only)
-- =============================================
CREATE OR REPLACE FUNCTION admin_update_child_email(
  p_child_id UUID,
  p_new_email TEXT,
  p_parent_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_family_id UUID;
  v_child_family_id UUID;
  v_child_role TEXT;
  v_parent_role TEXT;
BEGIN
  -- Get parent's family_id and role
  SELECT family_id, role INTO v_parent_family_id, v_parent_role
  FROM users
  WHERE id = p_parent_id;

  -- Verify parent is a parent
  IF v_parent_role != 'parent' THEN
    RAISE EXCEPTION 'Only parents can update child email';
  END IF;

  -- Get child's family_id and role
  SELECT family_id, role INTO v_child_family_id, v_child_role
  FROM users
  WHERE id = p_child_id;

  -- Verify child exists and is a child
  IF v_child_role != 'child' THEN
    RAISE EXCEPTION 'Target user is not a child';
  END IF;

  -- Verify they are in the same family
  IF v_parent_family_id != v_child_family_id THEN
    RAISE EXCEPTION 'Child is not in your family';
  END IF;

  -- Update email in auth.users
  UPDATE auth.users
  SET
    email = p_new_email,
    updated_at = NOW()
  WHERE id = p_child_id;

  -- Update email in users table as well
  UPDATE users
  SET
    email = p_new_email
  WHERE id = p_child_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_update_child_email(UUID, TEXT, UUID) TO authenticated;
