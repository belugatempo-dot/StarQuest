# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**StarQuest** is a gamified family behavior tracking system built with Next.js 15 and Supabase. Parents manage quests (duties, bonuses, violations) and children earn stars by completing tasks to unlock rewards. The app features a double-dimension quest classification system (type × scope), star multiplier functionality, and bilingual support (English/Chinese).

**Brand:** Beluga Tempo | 鲸律

**Import Path Alias:** `@/` maps to project root (configured in `tsconfig.json`). Always use `@/` for imports:
```typescript
import { createClient } from "@/lib/supabase/server";  // ✅ Correct
import { createClient } from "../../lib/supabase/server";  // ❌ Avoid
```

**Production URL:** https://starquest-qfo34obh3-beluga-tempos-projects.vercel.app

---

## Test-Driven Development (TDD) Principles

### Core TDD Philosophy

This project strictly follows **Test-Driven Development** methodology:

1. **RED**: Write failing tests first
2. **GREEN**: Write minimal code to pass tests
3. **REFACTOR**: Improve code while keeping tests green
4. **REPEAT**: Continuous iteration

### Quality Standards

✅ **All new features MUST have tests before implementation**
✅ **Test coverage target: Maintain >50% overall, >80% for critical components**
✅ **All PRs must pass 100% of existing tests**
✅ **No commits to main without passing test suite**

### Current Test Metrics (as of 2026-01-17)

```
✅ Test Suites: 28 passed, 28 total
✅ Tests: 753 passed, 753 total
⏱️  Execution Time: ~9s
📊 Overall Coverage: ~52%
   - components/admin: ~63%
   - components/auth: ~95%
   - components/child: ~83%
   - components/ui: 100%
   - ThemeProvider: 100% (53 tests)
```

### Test Organization

```
__tests__/
├── components/
│   ├── admin/              # 14 files, ~380 tests - Parent UI components
│   ├── auth/               # 3 files, 96 tests - Authentication flows
│   ├── child/              # 5 files, ~160 tests - Child UI components
│   ├── ui/                 # 1 file, 11 tests - Shared components
│   └── ThemeProvider.test.tsx  # 53 tests - Time-based theme switching
├── integration/            # 1 file, 13 tests - End-to-end flows
├── lib/                    # 1 file, 24 tests - Utility functions
└── types/                  # 2 files, 25 tests - Type system & logic
```

---

## Project Conventions (项目公约)

### Testing Requirements

**🚨 CRITICAL: Always run automated tests before declaring work complete**

Before reporting that any task is complete, you MUST:

1. **Run the full test suite**: `npm test`
2. **Verify all tests pass**: Ensure 100% test success rate
3. **Check for regressions**: No new test failures introduced
4. **Only then declare completion**: Report results to user

**Why this matters:**
- Prevents broken code from being deployed
- Maintains code quality and reliability
- Catches regressions early
- Ensures production stability

**Workflow:**
```bash
# 1. Make code changes
# 2. Run tests BEFORE declaring done
npm test

# 3. If tests fail, fix issues
# 4. Re-run tests until all pass
# 5. ONLY THEN report completion to user
```

**Exception:** When working on test files themselves, you may skip this step for the specific test file being written, but must still run related tests to ensure no regressions.

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

### Testing Commands
```bash
# Run all 753 tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report with detailed breakdown
npm run test:coverage

# Run specific test file
npm test -- LoginForm.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="email verification"

# Run tests for specific component pattern
npm test -- --testPathPattern="QuestFormModal|ResetPasswordModal"

# Run tests in verbose mode
npm test -- --verbose
```

**Note:** Integration tests skip actual Supabase calls when credentials are not available in test environment.

### Deployment Commands
```bash
# Deploy to Vercel production
vercel --prod

# Deploy to Vercel preview
vercel

# Check deployment status
vercel ls

# View deployment logs
vercel logs
```

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

### 2. Star Multiplier System (NEW - 2026-01-16)

**Purpose:** Allow severity-based adjustments for quest completions/violations.

**Features:**
- Multiplier range: 1× to 10×
- Real-time calculation display
- Auto-reset on quest change
- Bilingual UI support
- Works with all quest types (bonus, duty, violation)

**Implementation:**
```typescript
// components/admin/QuickRecordForm.tsx
const [multiplier, setMultiplier] = useState<number>(1);
const baseStars = selectedQuestData?.stars || customStars;
const starsToRecord = baseStars * multiplier;
```

**Use Cases:**
- Sleep violation: 10 mins late = 1×, 20 mins = 2×, 30 mins = 3×
- Extra effort: Did exceptionally well = 2×-3×
- Repeated violations: Multiple occurrences = higher multiplier

**Test Coverage:** 20 comprehensive tests added
- UI rendering and state management
- Calculation accuracy for all quest types
- Input validation and boundary conditions
- Bilingual support
- Edge cases (negative stars, large multipliers)

### 3. Authentication Flow & Session Management

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

### 4. Email Verification Flow

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
   - Site URL: `https://starquest-qfo34obh3-beluga-tempos-projects.vercel.app` (production)
   - Site URL: `http://localhost:3000` (development)
   - Redirect URLs whitelist must include:
     - `https://starquest-qfo34obh3-beluga-tempos-projects.vercel.app/*/auth/callback`
     - `https://starquest-qfo34obh3-beluga-tempos-projects.vercel.app/*/auth/confirmed`
     - `http://localhost:3000/*/auth/callback`
     - `http://localhost:3000/*/auth/confirmed`

**Error Handling:**
- Unverified user tries login → Show localized error + ResendVerificationButton
- Invalid/expired token → Redirect to `/auth/verify-email?error=invalid_token`
- ResendVerificationButton has 60s cooldown to prevent spam

**Testing:** Tests comprehensively cover email verification (ResendVerificationButton, callback route, LoginForm integration)

### 5. Locale-Based Routing (Next.js 15 + next-intl)

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

### 6. Route Groups Architecture

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

### 7. Database Schema Key Points

**Family-Scoped Data:** All tables (except `families`) have `family_id` with RLS policies ensuring data isolation.

**Star Transactions:**
- `star_transactions` table stores all star changes
- Positive stars = earnings, negative = deductions
- `status`: `pending` (child request) → `approved`/`rejected` by parent

**Database Functions:**
- `create_family_with_templates(...)`: Creates family + 36 quest templates + 11 rewards + 7 levels
- `initialize_family_templates(family_id)`: Seeds templates for existing family
- `admin_reset_child_password()`: SECURITY DEFINER function to update child passwords
- `admin_delete_child()`: Cascade delete child and related data
- `admin_update_child_email()`: SECURITY DEFINER function to update child email in auth.users
- Both template functions are **idempotent** (check for existing data before inserting)

**Critical Fix Applied:** Functions check for existing users before INSERT to prevent duplicate key errors.

### 8. Component Organization

**Shared UI:** `components/ui/` - Reusable components (LanguageSwitcher, etc.)

**Global Providers:** `components/` - App-wide providers (ThemeProvider)

**Role-Specific:**
- `components/child/` - Quest grids, reward catalogs (show only `bonus` quests)
- `components/admin/` - Quick record forms, approval centers (show all quest types)
- `components/auth/` - Login/register forms (use hard navigation)

**Pattern:** Components using Supabase must be Client Components (`"use client"`)

### 9. Time-Based Theme System (NEW - 2026-01-17)

**Purpose:** Automatic day/night theme switching based on time of day for enhanced UX.

**Component:** `components/ThemeProvider.tsx`

**Time Rules:**
- **Day Mode:** 7:00 AM - 5:59 PM (hours 7-17)
- **Night Mode:** 6:00 PM - 6:59 AM (hours 18-6)

**Color Palette:**
- **Day:** Soft Tiffany blue (#81D8D0) with cloud-like gradients
- **Night:** Starry dark blue (#0f172a → #1e3a5f → #312e81) with twinkling stars

**Implementation:**
```typescript
// components/ThemeProvider.tsx
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

// In component
const { mode, isDayMode, isNightMode } = useTheme();

// mode: "day" | "night"
// isDayMode: boolean
// isNightMode: boolean
```

**CSS Classes:** Applied to `document.body`
- `.theme-day` - Day mode styles
- `.theme-night` - Night mode styles (default)

**CSS Integration:** `app/globals.css` contains theme-specific overrides:
- `.theme-day .starry-bg` - Converts starry background to sunny sky
- `.theme-day .night-header` - Tiffany blue header gradient
- `.theme-day .star-glow` - Teal text glow instead of gold
- `.theme-day .net-stars-card` - Tiffany blue card background

**Auto-Refresh:** Theme checks every 60 seconds via `setInterval`

**Test Coverage:** 53 comprehensive tests covering:
- Rendering and context values (3 tests)
- Time-based mode detection (7 tests)
- useTheme hook functionality (5 tests)
- DOM class updates (4 tests)
- Interval management (4 tests)
- Edge cases and transitions (5 tests)
- All 24 hours boundary coverage (24 tests)

**Usage in Layout:**
```typescript
// app/[locale]/layout.tsx
import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
```

---

## Feature Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Next.js 15 project setup with TypeScript
- [x] Tailwind CSS configuration with custom theme
- [x] Internationalization (English + Simplified Chinese)
- [x] Supabase database schema and RLS policies
- [x] Authentication system with email verification
- [x] Basic layouts for child and parent views
- [x] Automated testing setup (700+ tests)

### ✅ Phase 2: Child Features (COMPLETED)
- [x] Child dashboard with star balance
- [x] Quest list with filtering and categories
- [x] Star request submission
- [x] Reward catalog with affordability check
- [x] Reward redemption requests
- [x] Activity history with filtering
- [x] Profile page with level progress and badge wall

### ✅ Phase 3: Parent Features (COMPLETED - 2026-01-17)
- [x] Parent dashboard with statistics
- [x] Quick record stars with multiplier (1-10×)
- [x] Approval center (star requests & redemption requests)
- [x] Quest management (CRUD with 14 categories)
- [x] Reward management (CRUD with 5 categories)
- [x] Level configuration management
- [x] Family member management (add/edit/delete children)
- [x] Password reset for children
- [x] Child email updates via API route
- [x] Activity log with calendar view
- [x] Transaction editing capabilities
- [x] Edit & approve rejected records (parent)
- [x] Request resubmission for rejected records (child)
- [x] Status display in activity history (pending/approved/rejected)
- [x] Time-based day/night theme switching (Tiffany blue day, starry night)

### 🚧 Phase 4: Advanced Features (IN PROGRESS)
- [ ] Advanced statistics and reports
- [ ] Family settings page
- [ ] Email notifications
- [ ] Weekly email reports
- [ ] Invite system for additional parents
- [ ] PWA support for offline access
- [ ] Data export functionality

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

**Test Coverage:** 85% (QuestManagement), 100% (QuestFormModal)

### Reward Management (CRUD)

**Component:** `components/admin/RewardManagement.tsx` with `RewardFormModal.tsx`

**Features:**
- Create/edit/delete rewards
- Toggle active/inactive status
- 5 reward categories (screen_time, toys, activities, treats, other)
- Stars cost configuration
- Description and icon customization
- Category filtering

**Test Coverage:** 94.64% (RewardManagement), 92.15% (RewardFormModal)
- 84 comprehensive tests across both components
- Full CRUD operations tested
- Bilingual support validated
- Error handling and edge cases covered

### Level Management

**Component:** `components/admin/LevelManagement.tsx` with `LevelFormModal.tsx`

**Features:**
- Create/edit/delete levels
- Configure star requirements
- Set level icons and badges
- Bilingual name/description support
- Sort order management

**Test Coverage:** 100% (LevelManagement), 89.18% (LevelFormModal)

### Family Member Management

**Page:** `app/[locale]/(parent)/admin/family/page.tsx`

**Components:**
- `FamilyMemberList.tsx` - Display parents and children (100% coverage)
- `AddChildModal.tsx` - Create child accounts with auto-generated passwords (100% coverage)
- `EditChildModal.tsx` - Update child name and email (92.59% coverage)
- `ResetPasswordModal.tsx` - Generate new passwords for children (100% coverage)

**API Routes:**
- `api/admin/reset-child-password/route.ts`
- `api/admin/delete-child/route.ts`
- `api/admin/update-child/route.ts` - Update child name and email

**Database Functions:**
- `admin_reset_child_password()` - SECURITY DEFINER function to update auth.users
- `admin_delete_child()` - Cascade delete child and related data
- `admin_update_child_email()` - SECURITY DEFINER function to update child email in auth.users

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

### Quick Record Form with Multiplier

**Component:** `components/admin/QuickRecordForm.tsx`

**Features:**
- Select child (auto-select if only one)
- Select from grouped quests (Bonus/Duty/Violation)
- Custom quest description with manual star input
- **Multiplier adjustment (1-10×)** for severity-based penalties/rewards
- Parent note (optional)
- Date selection for backdated records
- Real-time calculation display

**Multiplier Functionality:**
- Shows only when a quest is selected
- Default value: 1×
- Range: 1-10
- Auto-resets when changing quests
- Real-time calculation: `base stars × multiplier = actual stars`
- Bilingual helper text with examples

**Test Coverage:** 57.44% with 37 tests including:
- 17 original tests for core functionality
- 20 new tests for multiplier feature
- All edge cases and boundary conditions covered

### Bilingual Content

**Database:** Quest/reward tables have `title_en`, `title_zh`, `description_en`, `description_zh` fields.

**UI:** Use `next-intl`'s `useTranslations()` hook for interface text.

**Locale Switching:** `LanguageSwitcher` component in header, user preference saved in `users.locale`.

### Activity History & Request Management (NEW - 2026-01-17)

**Purpose:** Enable parents to edit/approve records and children to resubmit rejected requests.

**Components:**
- `EditTransactionModal.tsx` - Parent view for editing and approving records
- `ResubmitRequestModal.tsx` - Child view for resubmitting rejected requests
- `TransactionList.tsx` - Activity list with status indicators

**Status Workflow:**
```
pending → approved (parent approves)
pending → rejected (parent rejects with reason)
rejected → pending (child resubmits with modifications)
```

**EditTransactionModal Features:**
- View and edit star amounts
- Modify parent notes
- Change transaction status
- "Save & Approve" quick action for rejected records
- Bilingual support (EN/中文)

**ResubmitRequestModal Features:**
- Display rejection reason from parent
- Allow star value modification (1-100 range)
- Child note field for explanation
- Resubmit action resets status to pending

**Visual Status Indicators:**
- Pending: Yellow/amber styling with clock icon
- Approved: Green styling with checkmark
- Rejected: Red/pink styling with X icon

**Test Coverage:** Comprehensive tests in progress for both modals

---

## Testing Strategy

### Test-First Development

**ALWAYS follow this pattern:**
1. Write test describing desired behavior
2. Run test → see it fail (RED)
3. Write minimal code to pass test (GREEN)
4. Refactor while keeping tests green
5. Commit only when all tests pass

### Test Structure
```
__tests__/
├── types/              # Type system tests (quest grouping, filtering)
├── components/
│   ├── auth/          # Login/register form tests (96 tests, 94.82% coverage)
│   ├── child/         # Child UI component tests (152 tests, 83.13% coverage)
│   └── admin/         # Parent UI component tests (341 tests, 63.39% coverage)
├── integration/       # Registration flow tests (13 tests)
└── lib/               # Utility function tests (24 tests)
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

### Test Coverage Requirements

**Minimum Standards:**
- New features: Write tests BEFORE implementation
- Critical components (auth, payment, data modification): >85% coverage
- UI components: >70% coverage
- Utility functions: >90% coverage
- Overall project: >50% coverage

**Current Coverage Champions:**
- AddChildModal: 100%
- FamilyMemberList: 100%
- QuestFormModal: 100%
- LevelManagement: 100%
- LanguageSwitcher: 100%
- ThemeProvider: 100%
- LoginForm: 98%
- RewardManagement: 94.64%

### Running Tests

```bash
# Full test suite (should take <10s)
npm test

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- QuickRecordForm.test.tsx

# Verbose output
npm test -- --verbose

# Update snapshots (use sparingly)
npm test -- -u
```

**CI/CD Integration:**
- All tests run automatically on push
- PRs blocked if tests fail
- Coverage reports generated on each run
- Deployment only occurs if tests pass

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

**Complex Query Type Assertions:**
```typescript
// For complex queries with joins that TypeScript can't infer
const { data: transactions } = (await supabase
  .from("star_transactions")
  .select(`
    *,
    quests (name_en, name_zh),
    children:users (name, avatar_url)
  `)
  .eq("family_id", familyId)) as { data: any[] | null; error: any };
```

**Cookie Type Annotations:**
```typescript
// In server.ts and middleware.ts
cookies().set(name as any, value as any, options as any);
```

---

## Deployment

### Vercel Configuration

**File:** `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hkg1"]
}
```

**Environment Variables (Vercel Dashboard):**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key

**Setting Environment Variables:**
```bash
# Add production environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Add preview environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL preview

# List all environment variables
vercel env ls

# Pull environment variables to .env.local
vercel env pull
```

### Deployment Commands

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove old deployments
vercel rm [deployment-url]
```

### Pre-Deployment Checklist

✅ **Before deploying:**
1. Run full test suite: `npm test` (all 753 tests must pass)
2. Build locally: `npm run build` (must complete without errors)
3. Check environment variables in Vercel dashboard
4. Update Supabase redirect URLs (see below)
5. Commit all changes to git
6. Tag release: `git tag v1.x.x`

### Supabase Configuration for Production

**IMPORTANT:** After deployment, update Supabase settings:

1. **Navigate to:** Supabase Dashboard → Authentication → URL Configuration

2. **Site URL:**
   ```
   https://starquest-qfo34obh3-beluga-tempos-projects.vercel.app
   ```

3. **Redirect URLs (Add these patterns):**
   ```
   https://starquest-qfo34obh3-beluga-tempos-projects.vercel.app/*/auth/callback
   https://starquest-qfo34obh3-beluga-tempos-projects.vercel.app/*/auth/confirmed
   https://starquest-qfo34obh3-beluga-tempos-projects.vercel.app/*/auth/verify-email
   ```

4. **Email Templates:** Verify template URLs use production domain:
   ```
   {{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=email
   ```

5. **Test Registration Flow:**
   - Register new account
   - Check email verification works
   - Verify login after confirmation

### Post-Deployment Verification

After deployment, verify:
- [ ] Homepage loads correctly
- [ ] Language switcher works (EN/中文)
- [ ] Registration flow completes
- [ ] Email verification link works
- [ ] Login redirects properly
- [ ] Parent dashboard accessible
- [ ] Child dashboard accessible
- [ ] Database queries work
- [ ] No console errors in browser

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

### Issue: Build Failure on Activity Page
**Symptom:** TypeScript error - `Property 'stars' does not exist on type 'never'`
**Cause:** Supabase type inference issue with complex queries
**Fix:** Add type assertion `as { data: any[] | null; error: any }`

---

## Documentation Files

**Product:**
- `PRODUCT_DOCUMENTATION.md` - Complete product documentation (15,000+ words)
- `PRD_update.md` - Quest classification system specification
- `README.md` - Quick start guide

**Technical:**
- `CLAUDE.md` - This file - Development guide
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
4. Configure authentication settings (see Deployment section)
5. Update redirect URLs for production

---

## Development Workflow

### Starting New Feature

1. **Create feature branch:**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Write tests first (TDD):**
   ```bash
   # Create test file
   touch __tests__/components/MyComponent.test.tsx

   # Write failing tests
   npm run test:watch -- MyComponent.test.tsx
   ```

3. **Implement feature:**
   - Write minimal code to pass tests
   - Keep tests running in watch mode
   - Refactor when all tests green

4. **Verify coverage:**
   ```bash
   npm run test:coverage
   ```

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: add feature with tests

   ✨ New Features:
   - Feature description

   🧪 Testing:
   - X comprehensive tests added
   - Coverage: Y%

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

   git push origin feature/feature-name
   ```

### Code Review Checklist

Before marking PR as ready:
- [ ] All tests pass (npm test)
- [ ] Test coverage meets standards
- [ ] Build succeeds (npm run build)
- [ ] No console errors or warnings
- [ ] TypeScript types correct
- [ ] Bilingual support (if UI change)
- [ ] Documentation updated
- [ ] Commit messages follow convention

---

## Best Practices

### TDD Workflow
1. **RED:** Write test that fails
2. **GREEN:** Write code to pass test
3. **REFACTOR:** Improve code
4. **COMMIT:** Only when tests pass

### Testing Best Practices
- Test behavior, not implementation
- Use descriptive test names
- One assertion per test (when possible)
- Mock external dependencies
- Test edge cases and error states
- Keep tests fast (<10s total)

### Code Quality
- Follow existing patterns
- Use TypeScript strictly
- Handle errors gracefully
- Write self-documenting code
- Keep functions small and focused
- Avoid premature optimization

### Component Guidelines
- Client components: Use `"use client"` directive
- Server components: Default (no directive)
- Shared logic: Extract to utilities
- Styles: Use Tailwind classes
- Icons: Emoji or SVG
- Loading states: Always provide feedback

---

## When Adding Features

**ALWAYS consider:**
1. ✅ Write tests FIRST (TDD principle)
2. ✅ Quest type/scope classification
3. ✅ Parent vs child visibility rules
4. ✅ Bilingual support (EN + 中文)
5. ✅ Family-scoped queries (RLS)
6. ✅ Hard navigation for post-auth redirects
7. ✅ Type safety (TypeScript)
8. ✅ Error handling and loading states
9. ✅ Test coverage >70% for new code
10. ✅ Documentation updates

**When Fixing Bugs:**
1. ✅ Write test that reproduces bug
2. ✅ Fix bug (test should pass)
3. ✅ Check if related to session management
4. ✅ Verify locale handling
5. ✅ Confirm RLS policies
6. ✅ Test with both locales
7. ✅ Run full test suite
8. ✅ Update documentation if needed

---

## Support & Resources

**Documentation:**
- Next.js 15: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- next-intl: https://next-intl-docs.vercel.app/
- Jest: https://jestjs.io/docs/getting-started
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/

**Project Specific:**
- Architecture decisions: See `PRODUCT_DOCUMENTATION.md`
- Database schema: See `supabase/migrations/COMPLETE_SCHEMA.sql`
- Test patterns: See `__tests__/README.md` (if exists)
- Known issues: See "Known Issues & Fixes" section above

---

**Last Updated:** 2026-01-17
**Version:** 3.2 (Phase 3 Complete - Production Ready)
**Test Suite:** 753 tests passing (100%)
**Deployment:** Vercel Production
**Made with ❤️ by Beluga Tempo | 鲸律**
