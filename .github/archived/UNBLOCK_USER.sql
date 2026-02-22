-- =============================================
-- UNBLOCK STUCK USER - Quick Fix
-- =============================================
-- Run this in Supabase SQL Editor to manually verify
-- the stuck user account
-- =============================================

UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'flyrhyme@gmail.com';

-- Verify the update worked:
SELECT
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
WHERE email = 'flyrhyme@gmail.com';

-- =============================================
-- What this does:
-- =============================================
-- 1. Sets email_confirmed_at to current timestamp
-- 2. Sets confirmed_at to current timestamp
-- 3. This allows the user to login immediately
--
-- After running this:
-- - User can login with their password
-- - No "Email not confirmed" error
-- - This is a temporary fix while we implement
--   the complete email verification flow
-- =============================================
