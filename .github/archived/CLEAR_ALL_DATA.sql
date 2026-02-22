-- =============================================
-- CLEAR ALL DATA - StarQuest Database
-- =============================================
-- WARNING: This will delete ALL data from the database!
-- Use this for testing/development only.
--
-- ⚠️ IMPORTANT: This script only clears public schema tables.
-- To fully reset for testing, you MUST also clear auth.users:
--   Option 1: Supabase Dashboard → Authentication → Users → Select all → Delete
--   Option 2: Run Step 6 below (requires service_role permissions)
--
-- If you skip auth.users cleanup, re-registration with the same
-- email will fail with "duplicate key" or "already registered" errors.
-- =============================================

-- Step 1: Disable triggers temporarily for faster deletion
-- =============================================
SET session_replication_role = 'replica';

-- Step 2: Delete child tables first (with foreign key dependencies)
-- =============================================

-- Delete star transactions (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'star_transactions') THEN
    DELETE FROM star_transactions;
    RAISE NOTICE 'Deleted all records from star_transactions';
  END IF;
END $$;

-- Delete redemptions (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redemptions') THEN
    DELETE FROM redemptions;
    RAISE NOTICE 'Deleted all records from redemptions';
  END IF;
END $$;

-- Delete family invites (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_invites') THEN
    DELETE FROM family_invites;
    RAISE NOTICE 'Deleted all records from family_invites';
  END IF;
END $$;

-- Delete levels (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'levels') THEN
    DELETE FROM levels;
    RAISE NOTICE 'Deleted all records from levels';
  END IF;
END $$;

-- Delete rewards (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rewards') THEN
    DELETE FROM rewards;
    RAISE NOTICE 'Deleted all records from rewards';
  END IF;
END $$;

-- Delete quests (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quests') THEN
    DELETE FROM quests;
    RAISE NOTICE 'Deleted all records from quests';
  END IF;
END $$;

-- Step 3: Delete users (references families)
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    DELETE FROM users;
    RAISE NOTICE 'Deleted all records from users';
  END IF;
END $$;

-- Step 4: Delete families (parent table)
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'families') THEN
    DELETE FROM families;
    RAISE NOTICE 'Deleted all records from families';
  END IF;
END $$;

-- Step 5: Re-enable triggers
-- =============================================
SET session_replication_role = 'origin';

-- =============================================
-- Step 6: Clear auth.users (Requires service_role)
-- =============================================
-- ⚠️ CRITICAL: You MUST also clear auth.users to fully reset the database.
-- Otherwise, re-registration will fail with orphaned auth records.
--
-- OPTION 1: Manual cleanup via Supabase Dashboard (RECOMMENDED)
-- ---------------------------------------------------------------
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Select all test users
-- 3. Click "Delete users"
-- 4. Confirm deletion
--
-- OPTION 2: SQL cleanup (requires service_role key)
-- --------------------------------------------------
-- Run this in Supabase SQL Editor with service_role permissions:
--
-- ⚠️ UNCOMMENT THE LINES BELOW TO USE:
/*
DELETE FROM auth.users
WHERE id NOT IN (
  -- Preserve any Supabase system accounts (if any)
  SELECT id FROM auth.users WHERE email LIKE '%@supabase%'
);
*/

-- =============================================
-- Summary
-- =============================================
-- ✅ All public schema data has been cleared.
-- ⚠️  auth.users requires separate cleanup (see Step 6 above).
-- 📝 After clearing auth.users, you can re-register with the same emails.
-- 🔄 Template data will be automatically created on new family registration.
-- =============================================
