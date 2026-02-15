# 🧪 Registration Flow Test Plan

## ✅ Pre-Test Checklist

- [x] All automated tests passing (61/61)
- [x] Dev server running on http://localhost:3003
- [x] Supabase Auth UI library installed
- [x] Database function updated to prevent duplicate key errors

---

## 📋 Test Scenarios

### Test 1: Access Registration Page

**Steps:**
1. Open browser to: `http://localhost:3003/en/register`

**Expected Results:**
- ✅ Page loads without errors
- ✅ Shows StarQuest branding
- ✅ Shows "Create your family account" heading
- ✅ Supabase Auth form visible with:
  - Email input field
  - Password input field
  - Register button
  - "Already have an account? Sign in" link

**Status:** ✅ VERIFIED (via curl test)

---

### Test 2: Password Validation (Built-in)

**Note:** Supabase Auth UI automatically includes:
- Minimum password length validation
- Email format validation
- Password confirmation (built-in to the library)

**Steps:**
1. Try to submit with empty fields
2. Try invalid email format
3. Try password shorter than 6 characters

**Expected Results:**
- ✅ Form shows validation errors
- ✅ Cannot submit with invalid data

---

### Test 3: Successful Registration - New User

**Steps:**
1. Enter valid email: `test1@example.com`
2. Enter password: `Test123456!`
3. Click "Register"
4. Wait for auth to complete
5. Form should switch to "Create Your Family" step
6. Enter Family Name: `Test Family 1`
7. Enter Parent Name: `Test Parent`
8. Click "Continue"

**Expected Results:**
- ✅ Step 1: Supabase creates auth user
- ✅ Step 2: Shows family creation form
- ✅ Step 3: Database function creates:
  - 1 family record
  - 1 parent user record
  - 36 quest templates (11 duties + 18 bonus + 7 violations)
  - 11 reward templates
  - 7 level templates
- ✅ Redirects to `/en/admin`
- ✅ User is logged in

---

### Test 4: Duplicate Email Prevention

**Steps:**
1. Try to register again with same email: `test1@example.com`

**Expected Results:**
- ✅ Supabase Auth shows error: "User already registered"
- ✅ No duplicate database records created

---

### Test 5: Database Function Idempotency

**Scenario:** User tries to create family multiple times

**Steps:**
1. Register new user: `test2@example.com`
2. Complete family creation
3. Manually call `create_family_with_templates` again with same user_id

**Expected Results:**
- ✅ Function checks if user already has family
- ✅ Returns existing family_id
- ✅ Does NOT create duplicate records
- ✅ No error thrown

---

### Test 6: Locale Support

**Steps:**
1. Visit Chinese registration: `http://localhost:3003/zh-CN/register`
2. Complete registration
3. Check database user record

**Expected Results:**
- ✅ UI shows Chinese text where applicable
- ✅ User record has `locale = 'zh-CN'`
- ✅ Redirects to `/zh-CN/admin`

---

### Test 7: Email Confirmation (if enabled in Supabase)

**Note:** Check Supabase Dashboard → Authentication → Settings

**If email confirmation is enabled:**
- ✅ User receives confirmation email
- ✅ Must click link to verify
- ✅ Then can log in

**If disabled (for testing):**
- ✅ User can log in immediately

---

## 🗄️ Database Verification Queries

After successful registration, run in Supabase SQL Editor:

```sql
-- 1. Check family was created
SELECT * FROM families
WHERE name = 'Test Family 1';

-- 2. Check user was created
SELECT id, family_id, name, email, role, locale
FROM users
WHERE email = 'test1@example.com';

-- 3. Check quest templates (should be 36)
SELECT type, scope, COUNT(*) as count
FROM quests
WHERE family_id = (SELECT id FROM families WHERE name = 'Test Family 1')
GROUP BY type, scope
ORDER BY type, scope;

-- Expected results:
-- bonus  | family | 7
-- bonus  | other  | 5
-- bonus  | self   | 6
-- duty   | self   | 11
-- violation | self | 7

-- 4. Check rewards (should be 11)
SELECT COUNT(*) as reward_count
FROM rewards
WHERE family_id = (SELECT id FROM families WHERE name = 'Test Family 1');

-- 5. Check levels (should be 7)
SELECT COUNT(*) as level_count
FROM levels
WHERE family_id = (SELECT id FROM families WHERE name = 'Test Family 1');
```

---

## ⚠️ Known Issues & Fixes

### Issue 1: Duplicate Key Error ✅ FIXED
**Error:** `duplicate key value violates unique constraint "users_pkey"`

**Fix Applied:**
- Updated `create_family_with_templates` function
- Added check for existing users
- Prevents duplicate INSERT

**Migration File:** `20250102000002_fix_create_family_function.sql`

### Issue 2: Missing Password Confirmation ✅ FIXED
**Problem:** Original custom form didn't have password confirmation

**Fix Applied:**
- Replaced with `@supabase/auth-ui-react`
- Built-in password validation
- Professional UI/UX

---

## 🚀 Next Steps After Registration Tests Pass

1. **Test Login Flow**
   - Use registered credentials
   - Verify session persistence

2. **Test Child Addition**
   - Go to Family Management
   - Add a child user
   - Verify child can log in

3. **Test Quest Classification**
   - Parent: View quick record page (3 groups)
   - Child: View quests page (only bonus quests)

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Access Page | ✅ Pass | Page loads correctly |
| 2. Password Validation | ⏳ Pending | Manual test required |
| 3. New User Registration | ⏳ Pending | Manual test required |
| 4. Duplicate Prevention | ⏳ Pending | Manual test required |
| 5. Function Idempotency | ⏳ Pending | Manual test required |
| 6. Locale Support | ⏳ Pending | Manual test required |
| 7. Email Confirmation | ⏳ Pending | Check Supabase settings |

---

**Last Updated:** 2025-12-25
**Test Environment:** http://localhost:3003
**Automated Tests:** 61/61 passing ✅
