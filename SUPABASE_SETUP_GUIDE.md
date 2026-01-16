# Supabase Project Setup Guide for StarQuest

**Date:** 2026-01-15
**Purpose:** Complete setup guide for configuring Supabase backend for StarQuest application

---

## Step 1: Create New Supabase Project

### 1.1 Navigate to Supabase Dashboard
- Open your browser and go to: **https://supabase.com/dashboard**
- Sign in with your account (or create one if needed)

### 1.2 Create New Project
1. Click the **"New Project"** button
2. Fill in the project details:
   - **Name:** `StarQuest` or `starquest-dev`
   - **Database Password:** Choose a strong password
     - **IMPORTANT:** Save this password securely! You'll need it for database access.
     - Suggestion: Use a password manager
   - **Region:** Select the region closest to you for best performance
     - US East (Ohio) - `us-east-1`
     - Europe (Frankfurt) - `eu-central-1`
     - Asia Pacific (Singapore) - `ap-southeast-1`
   - **Pricing Plan:** Free tier is sufficient for development

3. Click **"Create new project"**
4. Wait 2-3 minutes for project provisioning

---

## Step 2: Get Your API Credentials

### 2.1 Navigate to API Settings
1. Once your project is ready, click on your project
2. Go to **Settings** (gear icon in sidebar)
3. Click **API** in the settings menu

### 2.2 Copy Credentials
You'll see two important credentials:

**Project URL:**
- Format: `https://xxxxxxxxxxxxx.supabase.co`
- Example: `https://abcdefghijk.supabase.co`
- Copy this entire URL

**anon/public Key:**
- This is a long JWT token starting with `eyJ...`
- Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI...`
- Copy the entire token (it's very long, ~200+ characters)

**Service Role Key (Optional):**
- Also copy this for future admin operations
- Keep it secure - never expose in client-side code!

---

## Step 3: Update Environment Variables

Your `.env.local` file should look like this:

```bash
# Replace with your actual credentials from Step 2
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI...

# Optional: For admin operations (keep secure!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI...
```

**IMPORTANT:**
- Never commit `.env.local` to version control
- The file is already in `.gitignore`
- Keep your service role key secret

---

## Step 4: Set Up Database Schema

### 4.1 Navigate to SQL Editor
1. In Supabase dashboard, click **SQL Editor** in the sidebar
2. Click **"New query"** button

### 4.2 Run the Complete Schema

**Option A: Run Complete Schema (Recommended for fresh setup)**

1. Open the file: `supabase/migrations/COMPLETE_SCHEMA.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **"Run"** or press `Ctrl+Enter` (Mac: `Cmd+Enter`)
5. Wait for execution to complete (may take 30-60 seconds)
6. You should see: "Success. No rows returned"

**Option B: Run Migrations Incrementally**

If you prefer to run migrations one by one:
```bash
# In your terminal, if you have Supabase CLI installed
supabase db push
```

Or run each migration file manually in SQL Editor in this order:
1. `20241224000000_initial_schema.sql`
2. `20241224000001_add_quest_templates.sql`
3. `20250102000000_add_reward_templates.sql`
4. (and so on...)

---

## Step 5: Verify Database Setup

### 5.1 Check Tables Created
1. In Supabase dashboard, click **Table Editor** in sidebar
2. You should see these tables:
   - ✅ `families`
   - ✅ `users`
   - ✅ `quests`
   - ✅ `rewards`
   - ✅ `levels`
   - ✅ `star_transactions`
   - ✅ `child_quests`
   - ✅ `redemptions`
   - ✅ `invite_codes`

### 5.2 Check Database Functions
1. Click **Database** in sidebar
2. Click **Functions**
3. You should see these functions:
   - ✅ `create_family_with_templates`
   - ✅ `initialize_family_templates`
   - ✅ `join_family_with_invite`
   - ✅ `validate_invite_code`
   - ✅ `admin_reset_child_password`
   - ✅ `admin_delete_child`

---

## Step 6: Configure Email Authentication

### 6.1 Enable Email Provider
1. Go to **Authentication** in sidebar
2. Click **Providers**
3. Find **Email** provider
4. Ensure it's **Enabled** (toggle should be ON)

### 6.2 Configure Email Templates

**Confirm Signup Template:**
1. Go to **Authentication** → **Email Templates**
2. Click **"Confirm signup"** template
3. Update the **Confirmation link** section:

**Replace the default link with:**
```
{{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=email
```

**Complete Template Example:**
```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your email:</p>
<p><a href="{{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm your email</a></p>
```

4. Click **Save**

**Other Templates (Optional):**
- You can customize other templates (Reset Password, Magic Link, etc.) later
- They follow similar patterns

### 6.3 Configure URL Settings

1. Go to **Authentication** → **URL Configuration**

2. Set **Site URL:**
   ```
   http://localhost:3000
   ```
   (For production, change to your actual domain like `https://starquest.com`)

3. Add **Redirect URLs** (one per line):
   ```
   http://localhost:3000/*/auth/callback
   http://localhost:3000/*/auth/confirmed
   http://localhost:3000/*/auth/verify-email
   http://localhost:3000/en/auth/callback
   http://localhost:3000/zh-CN/auth/callback
   http://localhost:3000/en/admin
   http://localhost:3000/zh-CN/admin
   ```

4. Click **Save**

### 6.4 Email Rate Limiting (Optional)

1. Go to **Authentication** → **Rate Limits**
2. Review default settings:
   - Email sends per hour: 30 (reasonable for dev)
   - You can adjust if needed

---

## Step 7: Configure SMTP Settings (For Email Delivery)

**For Development:** Supabase provides built-in email service (rate limited)
- Default: Uses Supabase's SMTP
- Limit: ~3-4 emails per hour (free tier)
- Good enough for testing

**For Production:** Configure your own SMTP provider
1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Configure your provider (e.g., SendGrid, AWS SES, Mailgun):
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: Your SendGrid API key
5. Click **Save**

**Recommended Providers:**
- **SendGrid:** Free tier - 100 emails/day
- **AWS SES:** $0.10 per 1,000 emails
- **Mailgun:** Free tier - 1,000 emails/month

---

## Step 8: Test Database Connection

### 8.1 Test from Terminal

Run this test script:

```bash
# Test connectivity
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/rest/v1/rpc/validate_invite_code" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_invite_code": "TEST1234"}'
```

Expected response: `[]` (empty array - code doesn't exist, but connection works!)

### 8.2 Test from Application

1. Restart your dev server:
   ```bash
   # Kill existing server
   kill $(lsof -t -i:3000)

   # Start fresh
   npm run dev
   ```

2. Open browser console (F12)
3. Navigate to: `http://localhost:3000/en/register`
4. Check console - errors should be gone!

---

## Step 9: Create Test Account

### 9.1 Register First User

1. Navigate to: `http://localhost:3000/en/register`
2. Fill in the form:
   - **Email:** `test@example.com` (use a real email you can access)
   - **Password:** `password123`
   - **Confirm Password:** `password123`
   - **Family Name:** `Test Family`
   - **Parent Name:** `Test Parent`
3. Click **Register**

### 9.2 Verify Email

1. Check your email inbox (including spam folder)
2. You should receive: "Confirm your signup" email
3. Click the confirmation link
4. You'll be redirected to: `/en/auth/confirmed`

### 9.3 Login

1. Click **"Go to Login"** button
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
3. Click **Sign in**
4. You should be redirected to: `/en/admin` (parent dashboard)

---

## Step 10: Verify Data Creation

### 10.1 Check Supabase Dashboard

1. Go to **Table Editor**
2. Click **`families`** table
   - You should see 1 row with your family name

3. Click **`users`** table
   - You should see 1 row with your parent account

4. Click **`quests`** table
   - You should see **36 quest templates** automatically created!

5. Click **`rewards`** table
   - You should see **11 reward templates**

6. Click **`levels`** table
   - You should see **7 level templates**

### 10.2 Check Application

1. Navigate to: `http://localhost:3000/en/admin/quests`
2. You should see your quest templates grouped by type

3. Navigate to: `http://localhost:3000/en/admin/family`
4. You should see your parent account listed

---

## Troubleshooting

### Problem: "fetch failed" errors persist

**Solution:**
1. Double-check `.env.local` credentials
2. Ensure no extra spaces or quotes
3. Restart dev server completely:
   ```bash
   kill $(lsof -t -i:3000)
   npm run dev
   ```
4. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

### Problem: "Invalid API key" error

**Solution:**
1. Verify you copied the **anon key** (not service_role key)
2. The key should start with `eyJ...`
3. Ensure the entire key is copied (200+ characters)
4. Check for line breaks in the key - it should be one continuous string

---

### Problem: No email received

**Solution:**
1. Check spam folder
2. Verify email provider is enabled (Auth → Providers → Email)
3. Check Auth logs: **Authentication** → **Logs**
4. If using free tier, you may hit rate limits (3-4 emails/hour)
5. Wait a few minutes and try resending

---

### Problem: SQL schema execution failed

**Solution:**
1. Check if tables already exist: **Table Editor**
2. If tables exist but incomplete, you can:
   - Drop all tables and re-run (use with caution!)
   - Or run individual migration files for missing pieces
3. Check error message in SQL Editor for specific issues
4. Ensure you're using PostgreSQL syntax (Supabase uses Postgres)

---

### Problem: "redirect_uri not allowed" error

**Solution:**
1. Go to **Authentication** → **URL Configuration**
2. Ensure redirect URLs include wildcards:
   - `http://localhost:3000/*/auth/callback`
3. Or add specific URLs:
   - `http://localhost:3000/en/auth/callback`
   - `http://localhost:3000/zh-CN/auth/callback`
4. Save and try again

---

## Security Checklist

Before going to production:

- [ ] Change database password to strong password
- [ ] Never commit `.env.local` to git
- [ ] Keep service_role key secret
- [ ] Enable Row Level Security (RLS) on all tables (already done in schema)
- [ ] Configure custom SMTP for production
- [ ] Update Site URL to production domain
- [ ] Add production redirect URLs
- [ ] Enable rate limiting on auth endpoints
- [ ] Consider adding reCAPTCHA to registration form
- [ ] Review and test RLS policies
- [ ] Set up database backups
- [ ] Enable database logging for security monitoring

---

## Next Steps

After successful setup:

1. **Create Additional Test Accounts:**
   - Child accounts
   - Second parent account (using invite code)

2. **Test All Features:**
   - Quest management
   - Reward management
   - Star transactions
   - Family member management

3. **Customize Templates:**
   - Edit quest templates for your needs
   - Customize reward templates
   - Adjust level thresholds

4. **Production Preparation:**
   - Set up custom domain
   - Configure production SMTP
   - Set up monitoring
   - Create backup strategy

---

## Resources

**Supabase Documentation:**
- Main docs: https://supabase.com/docs
- Auth docs: https://supabase.com/docs/guides/auth
- RLS docs: https://supabase.com/docs/guides/auth/row-level-security
- Email templates: https://supabase.com/docs/guides/auth/auth-email-templates

**Project Documentation:**
- `CLAUDE.md` - Development guide
- `PRODUCT_DOCUMENTATION.md` - Product features
- `REGISTRATION_TEST_REPORT.md` - Testing guide

---

## Support

If you encounter issues:
1. Check Supabase logs: **Logs & Analytics** in dashboard
2. Check browser console for errors
3. Check dev server logs
4. Review this guide for missed steps

**Common Commands:**
```bash
# Restart dev server
kill $(lsof -t -i:3000) && npm run dev

# Run tests
npm test

# Check environment variables
cat .env.local

# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

---

**Setup Status:** ⏳ Waiting for Step 1-2 completion
