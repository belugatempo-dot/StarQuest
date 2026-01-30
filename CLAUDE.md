# CLAUDE.md

## Project Overview

**StarQuest** - Gamified family behavior tracking (Next.js 15 + Supabase). Parents manage quests, children earn stars for rewards. Features double-dimension quest classification (type × scope), star multiplier, bilingual support (EN/中文).

- **Brand:** Beluga Tempo | 鲸律
- **Production:** https://starquest-kappa.vercel.app
- **Import Alias:** Always use `@/` (maps to project root)

---

## Commands

```bash
# Development
npm run dev              # Dev server (port 3003 if 3000 occupied)
npm run build            # Production build
npm run lint             # Linting

# Testing (1036 tests, ~55% coverage)
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm test -- File.test.tsx  # Specific file

# Deployment
vercel --prod            # Production deploy
vercel                   # Preview deploy
```

---

## Critical Rules

### 1. Always Run Tests Before Completion
```bash
npm test  # Must pass 100% before declaring any task complete
```

### 2. TDD Workflow
RED → GREEN → REFACTOR → COMMIT (only when tests pass)

### 3. Authentication Navigation (CRITICAL)
**Always use `window.location.href` after login/register, NOT `router.push()`**
```typescript
// ✅ CORRECT - prevents login loop
window.location.href = `/${locale}/admin`;

// ❌ WRONG - causes infinite login loop due to cookie race condition
router.push(`/${locale}/admin`);
```

### 4. Quest Visibility
- **Children see ONLY `bonus` quests** (positive UX)
- Parents see all: `duty`, `bonus`, `violation`

### 5. Middleware Order
In `middleware.ts`: Run intl middleware FIRST, then Supabase session. Reversing breaks sessions.

---

## Architecture

### Quest Classification (Type × Scope)

| Type | Behavior |
|------|----------|
| `duty` | Not done = deduct stars |
| `bonus` | Done = earn stars |
| `violation` | Occurrence = deduct stars |

| Scope | Who |
|-------|-----|
| `self` | Self-improvement |
| `family` | Helping family |
| `other` | Helping others |

**Key Functions** (`types/quest.ts`):
- `groupQuests()` - Groups for parent UI (5 groups)
- `getChildVisibleQuests()` - Filters bonus only for children
- `getSuggestedStars()` - Recommends stars by type/scope/category

### Route Structure
```
app/[locale]/
├── (auth)/        # Public: login, register
├── (child)/app/   # Child role: /app/*
└── (parent)/admin/ # Parent role: /admin/*
```

**Auth Protection:**
- `requireParent(locale)` → redirects non-parents to `/app`
- `requireAuth(locale)` → redirects unauthenticated to `/login`

### Database

**Family-Scoped:** All tables have `family_id` with RLS policies.

**Key Functions:**
- `create_family_with_templates()` - Creates family + 36 quests + 11 rewards + 7 levels + 14 categories
- `admin_reset_child_password()` - SECURITY DEFINER for auth.users
- `admin_delete_child()` - Cascade delete
- `admin_update_child_email()` - SECURITY DEFINER for auth.users

### Component Organization
```
components/
├── ui/        # Shared UI (LanguageSwitcher)
├── auth/      # Login/register (use hard navigation!)
├── child/     # Child UI (bonus quests only)
├── admin/     # Parent UI (all quest types)
└── shared/    # Cross-role components (UnifiedActivityList)
```

**Rule:** Components using Supabase must be Client Components (`"use client"`)

---

## Key Features

### Star Multiplier (`QuickRecordForm.tsx`)
- Range: 1× to 10×
- Auto-resets on quest change
- `starsToRecord = baseStars * multiplier`

### Time-Based Theme (`ThemeProvider.tsx`)
- Day (7AM-6PM): Tiffany blue (#81D8D0)
- Night (6PM-7AM): Starry dark blue
- Auto-refresh every 60s
- Usage: `const { mode, isDayMode, isNightMode } = useTheme()`

### Credit System
Children can borrow stars with configurable interest rates and settlement periods.
- Tables: `credit_settings`, `credit_transactions`, `interest_tiers`, `settlement_history`
- View: `child_balances` - computed spendable stars

### Unified Activity List (`components/shared/UnifiedActivityList.tsx`)
Single component for parent/child activity views with role-based permissions.

| Feature | Parent | Child |
|---------|--------|-------|
| Edit star transactions | ✅ | ❌ |
| Edit redemption date | ✅ | ❌ |
| Delete star transactions | ✅ | ❌ |
| Batch approve/reject | ✅ | ❌ |
| Resubmit rejected | ❌ | ✅ |
| See all children | ✅ | ❌ |

### Admin Client with Fallback (`lib/supabase/server.ts`)
Falls back to anon key if `SUPABASE_SERVICE_ROLE_KEY` not set.

### Redemption Date Picker (`components/admin/RedemptionRequestList.tsx`)
Parents can set custom approval dates when approving redemption requests.
- **Individual approval**: Click "Approve" → Modal with date picker → Confirm
- **Batch approval**: Select items → Click "Approve All" → Modal with date picker → Confirm
- Date defaults to today, cannot be set in the future
- Uses `reviewed_at` field in `redemptions` table

### Redemption Date Editing (`components/admin/EditRedemptionModal.tsx`)
Parents can edit the date/time of existing redemptions from the activity list.
- Click ✏️ on any redemption in list or calendar view → Modal with date + time pickers → Save
- Updates `created_at` field so the redemption appears on the correct day in the calendar
- Useful for backdating when a redemption was forgotten on the actual day

### Configurable Quest Categories (`components/admin/CategoryManagement.tsx`)
Parents can manage quest categories from the Manage Quests page (below quest list).
- Table: `quest_categories` (family-scoped with RLS)
- 14 default categories seeded per family (Health, Study, Chores, etc.)
- CRUD operations: add, edit, toggle active/inactive, delete
- Categories used in quest forms and displayed as badges on quest cards

---

## Email Verification

**Flow:** Register → `/auth/verify-email` → Click email link → `/auth/callback` → `/auth/confirmed` → Login

**Supabase Config Required:**
1. Email template: `{{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=email`
2. Redirect URLs whitelist: `*/auth/callback`, `*/auth/confirmed`

**EmailOtpType:** Deprecated `'signup'` type - always default to `'email'`

---

## Common Patterns

### Supabase Queries
```typescript
// Server Components
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Client Components
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Family-scoped query
const { data } = await supabase
  .from("quests")
  .select("*")
  .eq("family_id", user.family_id);

// Use .maybeSingle() when record might not exist
const { data } = await supabase.from("quests").select("*").eq("id", id).maybeSingle();

// Type assertions for complex queries
const { data } = (await supabase.from("star_transactions").select(`*, quests (*)`)) as { data: any[] | null; error: any };
```

### i18n Config (`i18n/request.ts`)
```typescript
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  return {
    locale,  // ← MUST include this
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

---

## Testing

### Structure
```
__tests__/
├── components/{admin,auth,child,ui}/
├── integration/
├── lib/
└── types/
```

### Global Mocks (jest.setup.js)
Pre-mocked: `next-intl`, `next/navigation`, `@/lib/supabase/client`

### Key Patterns
```typescript
// Modal testing - use within() for scoped queries
import { within } from "@testing-library/react";
const modal = screen.getByRole('heading', { name: /title/i }).closest('div');
const btn = within(modal!).getByRole('button', { name: /save/i });

// Test required attributes (not React validation)
expect(input).toHaveAttribute('required');

// Async loading states
let resolvePromise: (value: any) => void;
const promise = new Promise((resolve) => { resolvePromise = resolve; });
mockFetch.mockReturnValue(promise);
// trigger action, assert loading state
resolvePromise!({ ok: true });
await waitFor(() => { /* assert completion */ });
```

---

## Environment

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key  # Optional, for admin operations
```

---

## Deployment Checklist

1. `npm test` - All tests pass
2. `npm run build` - No errors
3. Update Supabase redirect URLs for production
4. `vercel --prod`

**Supabase URLs to whitelist:**
- `https://your-domain.vercel.app/*/auth/callback`
- `https://your-domain.vercel.app/*/auth/confirmed`

---

## Known Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Login loop | `router.push()` after auth | Use `window.location.href` |
| Locale warning | Missing `locale` in i18n config | Return `{ locale, messages }` |
| Duplicate key on register | INSERT without existence check | Migration adds checks |
| TypeScript `never` type | Complex Supabase query | Add type assertion |

---

## Feature Checklist (When Adding)

- [ ] Write tests FIRST (TDD)
- [ ] Quest type/scope classification correct
- [ ] Parent vs child visibility rules
- [ ] Bilingual support (EN + 中文)
- [ ] Family-scoped queries (RLS)
- [ ] Hard navigation for post-auth
- [ ] Error handling and loading states
- [ ] Test coverage >70%

---

## References

- **Database Schema:** `supabase/migrations/COMPLETE_SCHEMA.sql`
- **Product Docs:** `PRODUCT_DOCUMENTATION.md`
- **Quest System:** `PRD_update.md`

---

**Last Updated:** 2026-01-29 | **Tests:** 1036 passing | **Coverage:** ~55%
