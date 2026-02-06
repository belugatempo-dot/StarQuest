# StarQuest Refactoring Plan

**Generated:** 2026-02-06 | **Author:** Claude Opus 4.6

---

## P0 — High Priority — DONE

### 1. `lib/localization.ts` — Bilingual Name Helpers
**Saved:** ~80 lines across 11 components
- Extracted `getLocalizedName(enName, zhName, locale)`
- Extracted `getQuestName(quest, locale)` and `getRewardName(reward, locale)`
- Replaced inline implementations in: RedemptionRequestList, StarRequestList, QuickRecordForm, EditTransactionModal, RewardManagement, QuestGrid, RewardGrid, RequestStarsModal, RedeemRewardModal, ChildRedemptionList, ResubmitRequestModal

### 2. `lib/hooks/useBatchSelection.ts` — Batch Selection Hook
**Saved:** ~210 lines across 3 components
- Extracted shared state: selectionMode, selectedIds, toggleSelection, selectAll, clearSelection, exitSelectionMode, batch processing state
- Replaced in: RedemptionRequestList, StarRequestList, UnifiedActivityList

### 3. `lib/date-utils.ts` — Consolidate formatDate
**Saved:** ~40 lines across 4 components
- Added `formatDateTime(dateString, locale, options?)` and `formatDateOnly()` to existing date-utils
- Replaced inline formatDate in: RedemptionRequestList, StarRequestList, SettlementHistoryTable, ChildRedemptionList

---

## P1 — Medium Priority — DONE (except #4)

### 4. `lib/api/require-parent.ts` — API Auth Middleware — DEFERRED
**Would save:** ~60 lines across 3 API routes
- Extract parent auth check pattern from: delete-child, reset-child-password, update-child routes
- Returns `{ user, adminClient }` or error NextResponse
- Deferred: lower impact, routes work fine as-is

### 5. `lib/api/cron-auth.ts` — Cron Auth Helper — DONE
**Saved:** ~20 lines across 2 cron routes
- Extracted Vercel cron auth check from: daily-jobs, settlement routes

### 6. `lib/reports/report-utils.ts` — Shared Report Data Processing — DONE
**Saved:** ~150 lines between weekly/monthly reports
- Extracted `fetchReportBaseData()` — shared Supabase queries
- Extracted `buildChildrenStats()` — per-child stats calculation
- Used in both generate-weekly.ts and generate-monthly.ts

### 7. Type Cleanup — DONE
- Consolidated `StarTransaction` and `RawStarTransaction` in `types/activity.ts` (identical types)
- Renamed `QuestCategory` → `QuestCategoryRow` in `types/category.ts` (avoid collision with union type in `quest.ts`)
- Typed `originalData` in `types/activity.ts` as `StarTransaction | RawRedemption | RawCreditTransaction`
- Removed unused export `transformToUnifiedActivity` from `lib/activity-utils.ts`

---

## P2 — Lower Priority (Future)

### 8. Split `UnifiedActivityList.tsx` (1044 lines)
- Extract `useActivityFilters` hook
- Extract `ActivityFilters.tsx`, `ActivityListView.tsx`, `ActivityCalendarView.tsx`
- Standalone `ActivityItem.tsx`

### 9. Shared Test Utilities
- Create `__tests__/helpers/test-mocks.ts` — Supabase/router mock factories
- Create `__tests__/helpers/test-data.ts` — Shared mock data
- Reduce duplication across 15+ test files (~500 lines)

### 10. Family Member Query Helper
- Create `lib/queries/family.ts` with `fetchWithFallback()` pattern
- Replace admin-client-with-fallback pattern in 4 admin pages

---

## Results

**Completed:** P0 items 1-3, P1 items 5-7 (6 of 7 planned items)
**Deferred:** P1 item 4 (API auth middleware — low impact)
**Remaining:** P2 items 8-10 (future work)

**Total savings:** ~531 lines removed (343 added, 874 removed across 31 files)
**New shared modules:** 4 files created
**Tests:** All 1093 tests pass, production build succeeds
