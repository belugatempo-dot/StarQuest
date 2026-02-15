-- Delete flyrhyme@gmail.com user
-- Run this in Supabase Dashboard → SQL Editor

-- First, check if the user exists
SELECT
  au.id as auth_id,
  au.email as auth_email,
  u.id as user_id,
  u.email as user_email,
  u.family_id
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE au.email = 'flyrhyme@gmail.com';

-- Delete from users table (if exists)
DELETE FROM users WHERE email = 'flyrhyme@gmail.com';

-- Delete from auth.users table
DELETE FROM auth.users WHERE email = 'flyrhyme@gmail.com';

-- Verify deletion
SELECT 'User deleted successfully! ✅' as status
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'flyrhyme@gmail.com'
);

-- Check all users count
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM users) as app_users_count;
