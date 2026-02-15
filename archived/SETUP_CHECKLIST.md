# StarQuest Supabase Setup - Quick Checklist

**Follow these steps in order. Check off each step as you complete it.**

---

## ☑️ Step 1: Create Supabase Project (5 minutes)

- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Enter project details:
  - [ ] Name: `StarQuest` or `starquest-dev`
  - [ ] Database password: _________________ (SAVE THIS!)
  - [ ] Region: Choose closest to you
- [ ] Click "Create new project"
- [ ] Wait 2-3 minutes for provisioning

---

## ☑️ Step 2: Copy API Credentials (2 minutes)

- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL**:
  ```
  https://________________.supabase.co
  ```
- [ ] Copy **anon public key** (starts with `eyJ...`):
  ```
  eyJ_________________________________________________
  ```
- [ ] Copy **service_role key** (optional, for later):
  ```
  eyJ_________________________________________________
  ```

---

## ☑️ Step 3: Update .env.local (1 minute)

**I'll help you update this file. Just tell me:**
1. Your Project URL
2. Your anon public key

And I'll update the file for you!

---

## ☑️ Step 4: Set Up Database (3 minutes)

- [ ] In Supabase dashboard, go to **SQL Editor**
- [ ] Click "New query"
- [ ] Open file: `supabase/migrations/COMPLETE_SCHEMA.sql`
- [ ] Copy ALL contents
- [ ] Paste into SQL Editor
- [ ] Click **Run** button
- [ ] Wait for "Success. No rows returned"
- [ ] Verify in **Table Editor**:
  - [ ] See `families` table
  - [ ] See `users` table
  - [ ] See `quests` table
  - [ ] See `rewards` table
  - [ ] See `levels` table
  - [ ] See `star_transactions` table

---

## ☑️ Step 5: Configure Email (5 minutes)

### 5.1 Enable Email Provider
- [ ] Go to **Authentication** → **Providers**
- [ ] Ensure **Email** is enabled (toggle ON)

### 5.2 Update Email Template
- [ ] Go to **Authentication** → **Email Templates**
- [ ] Click **"Confirm signup"**
- [ ] Find the confirmation link section
- [ ] Replace with:
  ```
  {{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=email
  ```
- [ ] Click **Save**

### 5.3 Configure URLs
- [ ] Go to **Authentication** → **URL Configuration**
- [ ] Set **Site URL**: `http://localhost:3000`
- [ ] Add **Redirect URLs** (paste all at once):
  ```
  http://localhost:3000/*/auth/callback
  http://localhost:3000/*/auth/confirmed
  http://localhost:3000/*/auth/verify-email
  http://localhost:3000/en/admin
  http://localhost:3000/zh-CN/admin
  ```
- [ ] Click **Save**

---

## ☑️ Step 6: Test Connection (2 minutes)

**I'll help you with this!** Once you give me the credentials, I will:
- [ ] Update .env.local
- [ ] Test the connection
- [ ] Restart the dev server
- [ ] Verify no errors

---

## ☑️ Step 7: Create Test Account (3 minutes)

- [ ] Navigate to: http://localhost:3000/en/register
- [ ] Fill in registration form:
  - [ ] Email: (use a real email you can access)
  - [ ] Password: `password123`
  - [ ] Confirm Password: `password123`
  - [ ] Family Name: `Test Family`
  - [ ] Parent Name: `Your Name`
- [ ] Click **Register**
- [ ] Should redirect to verify-email page

---

## ☑️ Step 8: Verify Email (3 minutes)

- [ ] Check email inbox (including spam)
- [ ] Find "Confirm your signup" email
- [ ] Click confirmation link
- [ ] Should redirect to `/auth/confirmed`
- [ ] See "Email Verified" message

---

## ☑️ Step 9: Login & Test (2 minutes)

- [ ] Click "Go to Login" button
- [ ] Enter your email and password
- [ ] Click "Sign in"
- [ ] Should redirect to `/en/admin` dashboard
- [ ] No errors in browser console
- [ ] Can see parent dashboard

---

## ☑️ Step 10: Verify Data Created (1 minute)

### In Supabase Dashboard:
- [ ] Go to **Table Editor** → **families**
  - Should see 1 row with your family

- [ ] Go to **Table Editor** → **users**
  - Should see 1 row with your parent account

- [ ] Go to **Table Editor** → **quests**
  - Should see **36 quest templates**!

- [ ] Go to **Table Editor** → **rewards**
  - Should see **11 reward templates**

- [ ] Go to **Table Editor** → **levels**
  - Should see **7 level templates**

### In Application:
- [ ] Navigate to: http://localhost:3000/en/admin/quests
  - Should see quest templates grouped by type

- [ ] Navigate to: http://localhost:3000/en/admin/family
  - Should see your parent account listed

---

## 🎉 Success Criteria

You're all set when:
- ✅ No "fetch failed" errors in dev server console
- ✅ Can register new account
- ✅ Receive verification email
- ✅ Can verify and login
- ✅ Can access parent dashboard
- ✅ See 36 quests, 11 rewards, 7 levels in database

---

## 🚨 Need Help?

**If you get stuck:**
1. Check the detailed guide: `SUPABASE_SETUP_GUIDE.md`
2. Let me know which step failed and I'll help troubleshoot
3. Common issues and solutions are in the troubleshooting section

**Ready to start?**
Complete Steps 1-2 first (create project and copy credentials), then share them with me and I'll help with the rest!

---

## Current Status:

- [ ] Step 1: Create project - **START HERE**
- [ ] Step 2: Copy credentials
- [ ] Step 3: Update .env (I'll help)
- [ ] Step 4: Database setup
- [ ] Step 5: Email config
- [ ] Step 6: Test connection (I'll help)
- [ ] Step 7: Test registration
- [ ] Step 8: Verify email
- [ ] Step 9: Login test
- [ ] Step 10: Verify data

**Estimated Total Time:** 20-25 minutes
