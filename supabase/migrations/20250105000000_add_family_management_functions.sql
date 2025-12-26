-- Family Management Functions
-- Functions to support family member management by parents

-- =============================================
-- FUNCTION: admin_reset_child_password
-- Reset a child's password (parent only)
-- =============================================
CREATE OR REPLACE FUNCTION admin_reset_child_password(
  p_child_id UUID,
  p_new_password TEXT,
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
    RAISE EXCEPTION 'Only parents can reset passwords';
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

  -- Update password in auth.users
  -- Note: This requires the function to be SECURITY DEFINER
  UPDATE auth.users
  SET
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = p_child_id;

  RETURN json_build_object('success', true);
END;
$$;

-- =============================================
-- FUNCTION: admin_delete_child
-- Delete a child account (parent only)
-- =============================================
CREATE OR REPLACE FUNCTION admin_delete_child(
  p_child_id UUID,
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
    RAISE EXCEPTION 'Only parents can delete children';
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

  -- Delete from auth.users (will cascade to users table due to ON DELETE CASCADE)
  DELETE FROM auth.users WHERE id = p_child_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_reset_child_password(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_child(UUID, UUID) TO authenticated;
