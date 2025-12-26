-- =============================================
-- RECOVER ORPHANED USERS - Admin Tool
-- =============================================
-- Use this script to identify and recover users who are stuck
-- in an orphaned state (auth.users exists but public.users doesn't)
--
-- Run this in Supabase SQL Editor
-- Requires service_role permissions for some operations
-- =============================================

-- =============================================
-- STEP 1: Identify Orphaned Auth Users
-- =============================================
-- Find auth users that don't have corresponding public.users records

SELECT
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at,
  au.last_sign_in_at,
  pu.id as public_user_id,
  pu.family_id,
  pu.name as user_name,
  CASE
    WHEN pu.id IS NULL THEN '❌ Orphaned (no public.users)'
    WHEN pu.family_id IS NULL THEN '⚠️  Incomplete (no family)'
    ELSE '✅ Complete'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IS NOT NULL  -- Skip anonymous users
ORDER BY
  CASE
    WHEN pu.id IS NULL THEN 1
    WHEN pu.family_id IS NULL THEN 2
    ELSE 3
  END,
  au.created_at DESC;

-- =============================================
-- STEP 2: Recovery Options
-- =============================================

-- -----------------------------------------------
-- OPTION A: Delete Orphaned Auth User (RECOMMENDED)
-- -----------------------------------------------
-- This allows the user to re-register from scratch.
-- The enhanced database functions will complete the registration automatically.
--
-- Replace 'user-uuid-here' with actual UUID from Step 1:

-- DELETE FROM auth.users WHERE id = 'user-uuid-here';

-- -----------------------------------------------
-- OPTION B: Complete Registration Manually
-- -----------------------------------------------
-- If you know what family the user should belong to,
-- you can create their public.users record manually.
--
-- Replace values with actual data:

/*
INSERT INTO public.users (id, family_id, name, email, role, locale)
VALUES (
  'user-uuid-here',           -- User's auth.users ID
  'family-uuid-here',         -- Target family ID
  'User Name',                -- User's display name
  'user@email.com',           -- User's email (must match auth.users)
  'parent',                   -- Role: 'parent' or 'child'
  'en'                        -- Locale: 'en' or 'zh-CN'
);
*/

-- -----------------------------------------------
-- OPTION C: Batch Delete All Orphaned Auth Users
-- -----------------------------------------------
-- ⚠️ USE WITH CAUTION! This deletes ALL orphaned auth users.
-- Users can then re-register, and the system will auto-complete registration.

/*
DELETE FROM auth.users
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE au.email IS NOT NULL
    AND pu.id IS NULL
);
*/

-- =============================================
-- STEP 3: Identify Public Users Without Auth
-- =============================================
-- Find public.users records without corresponding auth.users
-- (This should be very rare due to foreign key constraints)

SELECT
  pu.id as public_user_id,
  pu.email,
  pu.name,
  pu.family_id,
  pu.role,
  pu.created_at,
  '⚠️  Public user without auth' as issue
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- If found, these should be deleted:
-- DELETE FROM public.users WHERE id = 'orphaned-public-user-id';

-- =============================================
-- STEP 4: Verify Recovery
-- =============================================
-- After performing recovery, verify all users are in consistent state:

SELECT
  COUNT(*) FILTER (WHERE pu.id IS NULL) as orphaned_auth_users,
  COUNT(*) FILTER (WHERE pu.id IS NOT NULL AND pu.family_id IS NULL) as incomplete_users,
  COUNT(*) FILTER (WHERE pu.id IS NOT NULL AND pu.family_id IS NOT NULL) as complete_users,
  COUNT(*) as total_auth_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IS NOT NULL;

-- Ideal result: orphaned_auth_users = 0, incomplete_users = 0

-- =============================================
-- STEP 5: Test Enhanced Registration Function
-- =============================================
-- If you want to test that the auto-healing works,
-- you can call the function directly:

/*
SELECT create_family_with_templates(
  'Test Family',                        -- Family name
  'auth-user-uuid-here'::uuid,         -- Auth user ID (orphaned user)
  'Test User',                          -- User name
  'test@example.com',                   -- Email (must match auth.users)
  'en'                                  -- Locale
);
*/

-- This should:
-- 1. Detect the orphaned auth user
-- 2. Clean up any partial public.users record
-- 3. Create complete family + user + templates
-- 4. Return family_id

-- =============================================
-- Notes
-- =============================================
-- After recovery:
-- - Users can re-register with the same email (if auth.users was deleted)
-- - The enhanced database functions will automatically complete registration
-- - No manual intervention should be needed for future failures
--
-- Prevention:
-- - The enhanced database functions (migration 20250104000000) make
--   the system self-healing for future registrations
-- - Always clear both auth.users and public.users when testing
--   (see CLEAR_ALL_DATA.sql Step 6)
-- =============================================
