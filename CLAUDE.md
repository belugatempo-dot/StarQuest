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

# Testing (2476 tests, ~99% coverage)
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm test -- File.test.tsx  # Specific file

# Database
npm run db:backup [label]  # Manual pg_dump snapshot (requires SUPABASE_DB_URL)

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
├── ui/        # Shared UI (LanguageSwitcher, ModalFrame)
├── auth/      # Login/register (use hard navigation!)
├── child/     # Child UI (bonus quests only)
├── admin/     # Parent UI (all quest types)
└── shared/    # Cross-role components
    ├── UnifiedActivityList.tsx  # Main list orchestrator
    ├── ActivityItem.tsx         # Single activity row
    ├── ActivityDateGroup.tsx    # Date-grouped activity section
    ├── ActivityFilterBar.tsx    # Filter/search controls
    └── BatchActionBar.tsx       # Batch action toolbar
```

**Rule:** Components using Supabase must be Client Components (`"use client"`)

### Shared Utilities
```
lib/
├── localization.ts              # getLocalizedName(), getQuestName(), getRewardName()
├── date-utils.ts                # formatDateTime(), formatDateOnly() + existing utils
├── activity-utils.ts            # Activity list helpers
├── batch-operations.ts          # Batch approve/reject operations
├── hooks/useBatchSelection.ts   # Batch selection state hook
├── hooks/useActivityFilters.ts  # Activity filter/search state hook
├── api/cron-auth.ts             # verifyCronAuth() for cron route authorization
└── reports/report-utils.ts      # fetchReportBaseData(), buildChildrenStats()
```

**Key Types** (`types/`):
- `QuestCategoryRow` (in `category.ts`) — database row type (renamed from `QuestCategory` to avoid collision with union type in `quest.ts`)
- `StarTransaction` (in `activity.ts`) — consolidated from duplicate `RawStarTransaction`
- `UnifiedActivityItem.originalData` — typed as `StarTransaction | RawRedemption | RawCreditTransaction`

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

### Invite Parent (`components/admin/InviteParentCard.tsx`)
Email-based invitation flow for adding a co-parent to the family.
- Parent enters email → clicks "Send Invitation" → system generates invite code and emails it
- API route: `POST /api/invite-parent` (authenticates user, calls `create_family_invite` RPC, sends email via Resend)
- Email template: `lib/email/templates/invite-parent.ts` — branded email with "Join Family" CTA button, fallback invite code, 7-day expiry note
- Bilingual support (EN/中文)

### Email System (`lib/email/`)
Transactional email infrastructure using Resend.
- `lib/email/resend.ts` — Singleton Resend client, `sendEmail()` function
- `lib/email/templates/` — Branded HTML templates using `baseLayout()`:
  - `invite-parent.ts` — Parent invitation email
  - `weekly-report.ts` — Weekly star activity summary
  - `monthly-report.ts` — Monthly report with settlement data
  - `settlement-notice.ts` — Credit settlement notification
- Report data generation: `lib/reports/generate-weekly.ts`, `lib/reports/generate-monthly.ts`
- Cron endpoint: `GET /api/cron/daily-jobs` — handles settlements, weekly/monthly reports
- Settings page: `/admin/settings` — report preferences (email, timezone, enabled reports)

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
├── api/{admin,cron,invite-parent}/
├── app/{admin,auth,child}/
├── components/{admin,auth,child,shared,ui}/
├── hooks/
├── integration/
├── lib/{api,email,hooks,reports,supabase}/
├── middleware.test.ts
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
RESEND_API_KEY=your_resend_key              # For invitation & report emails
RESEND_FROM_EMAIL="StarQuest <noreply@beluga-tempo.com>"  # Optional sender override
```

---

## Database Safety

### Backups
- **Supabase automated:** Daily backups with 7-day retention (check Dashboard > Settings > Database)
- **Manual snapshot:** `npm run db:backup [label]` — creates local pg_dump before risky operations
- **Backup files:** Stored in `backups/` (gitignored, contains user data)

### When to Take Manual Backups
- Before running any new migration with ALTER/DROP/DELETE
- Before running settlement operations manually
- Before any bulk data modifications

### Recovery
- **Platform restore:** Supabase Dashboard > Settings > Database > Backups
- **Local restore:** `psql "$SUPABASE_DB_URL" < backups/[file].sql`

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
- [ ] Test coverage maintained (currently ~99%)

---

## References

- **Database Schema:** `supabase/migrations/COMPLETE_SCHEMA.sql`
- **Product Docs:** `PRODUCT_DOCUMENTATION.md`
- **Quest System:** `PRD_update.md`

---

**Last Updated:** 2026-02-07 | **Tests:** 2476 passing | **Coverage:** ~99%
