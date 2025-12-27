# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**StarQuest** is a gamified family behavior tracking system built with Next.js 15 and Supabase. Parents manage quests (duties, bonuses, violations) and children earn stars by completing tasks to unlock rewards. The app features a double-dimension quest classification system (type × scope) and bilingual support (English/Chinese).

**Brand:** Beluga Tempo | 鲸律

**Import Path Alias:** `@/` maps to project root (configured in `tsconfig.json`). Always use `@/` for imports:
```typescript
import { createClient } from "@/lib/supabase/server";  // ✅ Correct
import { createClient } from "../../lib/supabase/server";  // ❌ Avoid
```

---

## Development Commands

### Core Commands
```bash
# Development server (runs on port 3003 if 3000 is occupied)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Linting
npm run lint
```

### Testing
```bash
# Run all tests (370 tests as of 2025-12-27)
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test file
npm test -- LoginForm.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="email verification"

# Run tests for specific pattern
npm test -- --testPathPattern="QuestFormModal|ResetPasswordModal"
```

**Note:** Integration tests skip actual Supabase calls when credentials are not available in test environment.

---

## Critical Architecture Concepts

### 1. Quest Classification System (Core Feature)

Quests use a **double-dimension classification**:

**Type (What):**
- `duty`: Daily responsibilities (not done = deduct stars, done = 0)
- `bonus`: Extra effort (done = earn stars, not done = 0)
- `violation`: Rule breaking (occurrence = deduct stars)

**Scope (Who):**
- `self`: For oneself / self-improvement
- `family`: Helping family members
- `other`: Helping people outside family

**Critical:** Children can ONLY see `bonus` quests. `duty` and `violation` quests are parent-only to maintain positive UX.

**Implementation:** `types/quest.ts` contains:
- `groupQuests()`: Groups quests for parent UI (5 groups)
- `getChildVisibleQuests()`: Filters only bonus quests for child UI
- `getSuggestedStars()`: Recommends star values based on type/scope/category

### 2. Authentication Flow & Session Management

**CRITICAL ISSUE FIXED:** Login/registration must use `window.location.href` for navigation, NOT `router.push()`.

**Why:** Supabase session cookies are set asynchronously. Using client-side navigation (`router.push()`) causes a race condition where Server Components check auth before cookies are fully written, triggering infinite login loops.

**Correct Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase.auth.signInWithPassword({ email, password });
if (data.user) {
  window.location.href = `/${locale}/admin`; // Hard navigation
}

// ❌ WRONG - causes login loop
router.push(`/${locale}/admin`);
```

**Files:**
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`
- `lib/auth.ts` - Contains `requireAuth()` and `requireParent()` helpers

### 2.1 Email Verification Flow

**Architecture:** Complete email verification implemented using Supabase built-in email auth.

**Flow:**
1. User registers → `auth.signUp()` creates unverified auth.users
2. Redirect to `/auth/verify-email` page (not directly to dashboard)
3. User clicks email link → `/auth/callback` route validates token
4. On success → `/auth/confirmed` page → user can login

**Critical Implementation Details:**

**EmailOtpType Validation** (`app/[locale]/(auth)/auth/callback/route.ts`):
```typescript
import type { EmailOtpType } from '@supabase/supabase-js'

const validTypes: EmailOtpType[] = ['email', 'recovery', 'invite', 'email_change']
const otpType = validTypes.includes(type as EmailOtpType)
  ? (type as EmailOtpType)
  : 'email'  // Default for deprecated types like 'signup'
```

**Why this matters:** Supabase deprecated `'signup'` and `'magiclink'` types. Always validate and default to `'email'`.

**Supabase Configuration Required:**
1. **Email Templates** (Authentication → Email Templates → Confirm signup):
   - Use `{{ .TokenHash }}` not `{{ .ConfirmationURL }}`
   - Set `type=email` explicitly in URL
   - Template: `{{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=email`

2. **URL Configuration** (Authentication → URL Configuration):
   - Site URL: `http://localhost:3000` (dev) or production domain
   - Redirect URLs whitelist must include:
     - `http://localhost:3000/*/auth/callback`
     - `http://localhost:3000/*/auth/confirmed`

**Error Handling:**
- Unverified user tries login → Show localized error + ResendVerificationButton
- Invalid/expired token → Redirect to `/auth/verify-email?error=invalid_token`
- ResendVerificationButton has 60s cooldown to prevent spam

**Testing:** Tests comprehensively cover email verification (ResendVerificationButton, callback route, LoginForm integration)

### 3. Locale-Based Routing (Next.js 15 + next-intl)

**Structure:** All routes prefixed with locale: `/[locale]/(group)/path`

**Important:**
- `i18n/request.ts` MUST return `locale` in config (not just messages)
- Use `await requestLocale` (Next.js 15 API)
- **Middleware chaining order is critical:** `middleware.ts` must run intl middleware FIRST, then Supabase session middleware. Reversing this order will break session handling.

**Correct i18n Config:**
```typescript
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  return {
    locale,  // ← MUST include this
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

**Correct Middleware Chaining Pattern** (`middleware.ts`):
```typescript
export async function middleware(request: NextRequest) {
  // Step 1: Handle i18n FIRST
  const intlResponse = intlMiddleware(request);

  // Step 2: Update Supabase session with the intl response
  const response = await updateSession(request, intlResponse);

  return response;
}
```

### 4. Route Groups Architecture

```
app/[locale]/
├── (auth)/        # Public: login, register
├── (child)/       # Child role: /app/* routes
│   └── app/       # Nested to create /app prefix
└── (parent)/      # Parent role: /admin/* routes
    └── admin/     # Nested to create /admin prefix
```

**Auth Protection:**
- Parent routes use `requireParent(locale)` → redirects non-parents to `/app`
- Child routes use `requireAuth(locale)` → redirects unauthenticated to `/login`

### 5. Database Schema Key Points

**Family-Scoped Data:** All tables (except `families`) have `family_id` with RLS policies ensuring data isolation.

**Star Transactions:**
- `star_transactions` table stores all star changes
- Positive stars = earnings, negative = deductions
- `status`: `pending` (child request) → `approved`/`rejected` by parent

**Database Functions:**
- `create_family_with_templates(...)`: Creates family + 36 quest templates + 11 rewards + 7 levels
- `initialize_family_templates(family_id)`: Seeds templates for existing family
- Both functions are **idempotent** (check for existing data before inserting)

**Critical Fix Applied:** Functions check for existing users before INSERT to prevent duplicate key errors.

### 6. Component Organization

**Shared UI:** `components/ui/` - Reusable components (LanguageSwitcher, etc.)

**Role-Specific:**
- `components/child/` - Quest grids, reward catalogs (show only `bonus` quests)
- `components/admin/` - Quick record forms, approval centers (show all quest types)
- `components/auth/` - Login/register forms (use hard navigation)

**Pattern:** Components using Supabase must be Client Components (`"use client"`)

---

## Important Implementation Details

### Password Confirmation

Registration form (`components/auth/RegisterForm.tsx`) has **3 fields**:
1. Email
2. Password
3. Confirm Password ← User explicitly requested this

**Validation:**
```typescript
if (password !== confirmPassword) {
  setError(locale === "zh-CN" ? "密码不匹配" : "Passwords do not match");
  return;
}
```

### Quest Templates

**36 pre-configured templates** created on family registration:
- 11 duties (all scope: `self`)
- 18 bonuses (6 self + 7 family + 5 other)
- 7 violations (all scope: `self`)

**Seeding:** Happens in `create_family_with_templates` database function, NOT in code.

### Quest Management (CRUD)

**Component:** `components/admin/QuestManagement.tsx` with `QuestFormModal.tsx`

**Features:**
- Create/edit/delete quest templates
- Toggle active/inactive status
- 14 quest categories with icons (health, study, chores, hygiene, learning, social, creativity, exercise, reading, music, art, kindness, responsibility, other)
- Star value configuration
- Grouped display by type and scope (5 groups)

**Category Labels:** Defined in `types/quest.ts` with `categoryLabels` object containing icons and bilingual labels.

### Family Member Management

**Page:** `app/[locale]/(parent)/admin/family/page.tsx`

**Components:**
- `FamilyMemberList.tsx` - Display parents and children
- `AddChildModal.tsx` - Create child accounts with auto-generated passwords
- `EditChildModal.tsx` - Update child name and email
- `ResetPasswordModal.tsx` - Generate new passwords for children

**API Routes:**
- `api/admin/reset-child-password/route.ts`
- `api/admin/delete-child/route.ts`

**Database Functions:**
- `admin_reset_child_password()` - SECURITY DEFINER function to update auth.users
- `admin_delete_child()` - Cascade delete child and related data

**Password Generation:**
```typescript
// Format: Adjective + Noun + Number (e.g., "HappyStar123")
const adjectives = ["Happy", "Sunny", "Bright", "Lucky", "Swift"];
const nouns = ["Star", "Moon", "Cloud", "Tiger", "Dragon"];
```

**Security:**
- All operations require parent role
- Family scope verification ensures parents can only manage their own family
- SECURITY DEFINER functions for auth.users table access

### Bilingual Content

**Database:** Quest/reward tables have `title_en`, `title_zh`, `description_en`, `description_zh` fields.

**UI:** Use `next-intl`'s `useTranslations()` hook for interface text.

**Locale Switching:** `LanguageSwitcher` component in header, user preference saved in `users.locale`.

---

## Testing Strategy

### Test Structure
```
__tests__/
├── types/              # Type system tests (quest grouping, filtering)
├── components/
│   ├── auth/          # Login/register form tests
│   ├── child/         # Child UI component tests
│   └── admin/         # Parent UI component tests
├── integration/       # Registration flow tests
└── lib/               # Utility function tests
```

### Key Test Patterns

**Mock Supabase:** Tests use mocked Supabase clients (no real DB calls)

**Quest Type Testing:** Extensive tests for `groupQuests()`, `getChildVisibleQuests()`, etc.

**Component Testing:** Use `@testing-library/react` with `next-intl` provider wrapper

**Modal Testing:** For modals with multiple buttons, use `within()` to scope queries:
```typescript
import { within } from "@testing-library/react";

const modal = screen.getByRole('heading', { name: /modalTitle/i }).closest('div');
const buttons = within(modal!).getAllByRole('button');
const targetButton = buttons.find((btn) => btn.className.includes('bg-danger'));
```

**Testing HTML Required Attributes:** Components use HTML `required` attributes on inputs. Browser validation prevents submission with empty fields, so React validation code won't run:
```typescript
// Don't test React validation for empty required fields
// Instead, verify the required attribute exists
expect(input).toHaveAttribute('required');
```

**Async Loading States:** When testing loading states with promises, use manual promise resolution:
```typescript
let resolvePromise: (value: any) => void;
const promise = new Promise((resolve) => { resolvePromise = resolve; });

mockFetch.mockReturnValue(promise);
// ... trigger action
expect(screen.getByText("Loading...")).toBeInTheDocument();

// Resolve when ready
resolvePromise!({ ok: true, json: async () => ({}) });
await waitFor(() => { /* assert completion */ });
```

### Global Test Mocks

**Location:** `jest.setup.js` - Automatically loaded before all tests

**Mocked modules:**
- `next-intl`: `useTranslations()` returns identity function (key → key)
- `next/navigation`: `useRouter()`, `usePathname()`, `useSearchParams()`, `redirect()`
- `@/lib/supabase/client`: Complete Supabase client mock with auth and database methods

**Important:** When writing new tests, these mocks are already available. Don't re-mock them in individual test files unless you need custom behavior.

### Test Coverage (as of 2025-12-27)

- **Total Tests:** 370 passing across 18 test suites
- **Overall Coverage:** ~42%
- **Auth Components:** 94.82% coverage
- **Admin Components:** 60.15% coverage (core modals at 85-100%)
- **Fully Tested Components:**
  - AddChildModal, EditChildModal, FamilyMemberList (100%)
  - LoginForm (98%), RegisterForm (92%), ResendVerificationButton (100%)
  - StarRequestList, RedemptionRequestList (94%)
  - QuestManagement (85%), QuestFormModal (full coverage)
  - ResetPasswordModal (full coverage)

---

## Common Development Patterns

### Reading User Role
```typescript
const user = await requireAuth(locale);
if (user.role === "parent") {
  // Parent-specific logic
} else {
  // Child-specific logic
}
```

### Querying Supabase with Family Scope
```typescript
const { data } = await supabase
  .from("quests")
  .select("*")
  .eq("family_id", user.family_id)
  .eq("is_active", true);
```

### Creating Server/Client Supabase Instances
```typescript
// Server Components
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Client Components
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

### Handling Supabase Type Errors

**Common Pattern:** TypeScript strict mode can cause errors with Supabase queries. Use these patterns:

**Single vs MaybeSingle:**
```typescript
// Use .maybeSingle() when record might not exist (returns null)
const { data: quest } = await supabase
  .from("quests")
  .select("*")
  .eq("id", questId)
  .maybeSingle();

// Use .single() only when you're certain the record exists
const { data: user } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .single();
```

**RPC and Update Type Assertions:**
```typescript
// For database operations with type conflicts, use type assertion
await supabase
  .from("quests")
  .update({
    is_active: !quest.is_active,
  } as any)
  .eq("id", quest.id);

// For RPC calls
await supabase.rpc("some_function", { param: value } as any);
```

**Cookie Type Annotations:**
```typescript
// In server.ts and middleware.ts
cookies().set(name as any, value as any, options as any);
```

---

## Known Issues & Fixes

### Issue: Login Loop
**Symptom:** After successful login, immediately redirected back to `/login`
**Cause:** Client-side navigation before cookies fully written
**Fix:** Use `window.location.href` instead of `router.push()` (see Authentication Flow section)
**Details:** `LOGIN_FIX_REPORT.md`

### Issue: Locale Warning
**Symptom:** `A locale is expected to be returned from getRequestConfig`
**Cause:** Missing `locale` property in return object
**Fix:** Updated `i18n/request.ts` to return `{ locale, messages }`

### Issue: Duplicate Key Error on Registration
**Symptom:** `duplicate key value violates unique constraint "users_pkey"`
**Cause:** Function tried to INSERT user that already existed
**Fix:** Migration `20250102000002_fix_create_family_function.sql` adds existence checks

---

## Documentation Files

**Product:**
- `PRODUCT_DOCUMENTATION.md` - Complete product documentation (15,000+ words)
- `PRD_update.md` - Quest classification system specification
- `README.md` - Quick start guide

**Technical:**
- `REGISTRATION_TESTING_REPORT.md` - Password confirmation testing
- `LOGIN_FIX_REPORT.md` - Login loop fix (bilingual)
- `REGISTRATION_TEST_PLAN.md` - Manual test scenarios

**Database:**
- `supabase/migrations/COMPLETE_SCHEMA.sql` - Full database schema
- `supabase/migrations/*.sql` - Incremental migrations

---

## Environment Setup

**Required Environment Variables** (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Database Setup:**
1. Create Supabase project
2. Run migrations in order from `supabase/migrations/`
3. Or use `COMPLETE_SCHEMA.sql` for fresh setup

---

## Development Priorities

**Phase 3 (Current):** Parent features - In progress

**Completed in Phase 3:**
- ✅ Quick record stars (QuickRecordForm)
- ✅ Approval center (star requests & redemption requests)
- ✅ Family member management (add/edit/delete children, reset passwords)
- ✅ Quest management (CRUD operations with QuestFormModal)
- ✅ Comprehensive test suite (370 tests, 42% coverage)

**Remaining in Phase 3:**
- ⏳ Reward management (CRUD)
- ⏳ Level configuration
- ⏳ Additional test coverage for child components

**When Adding Features:**
1. Consider quest type/scope classification
2. Respect parent vs child visibility rules
3. Maintain bilingual support
4. Write tests before implementation
5. Use hard navigation for post-auth redirects
6. Ensure family-scoped queries

**When Fixing Bugs:**
1. Check if it's related to session management (use hard navigation)
2. Verify locale handling in i18n config
3. Confirm RLS policies for new queries
4. Test with both English and Chinese locales
5. Run full test suite before marking complete
