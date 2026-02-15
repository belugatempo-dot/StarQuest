# Plan: Add Record from Calendar Day Selection

## Context

Users want to add star records directly from the activity calendar. Currently, clicking a calendar day only **filters** the activity list. Parents must navigate to a separate `/admin/record` page to create records, and children must go to `/app/quests` to submit requests. This creates unnecessary friction — the user is already looking at a specific day and should be able to act on it immediately.

## User Stories

### Story 1: Parent adds a record from calendar
> As a parent, I want to select a day on the activity calendar and add a star record for that date, so that I can quickly backdate records without leaving the page.

**Acceptance Criteria:**
- Given I'm on the Activity Log page with calendar view, when I select a day (not in the future), then an "Add Record" button appears
- When I click "Add Record", a modal opens with the date pre-filled and locked
- I can select a child, pick a quest, adjust multiplier, add an optional note, and submit
- The record is created with `source: "parent_record"`, `status: "approved"`, `created_at` = selected date
- On success, the modal closes and the activity list refreshes

### Story 2: Child submits a request from calendar
> As a child, I want to select a day on the activity calendar and submit a quest request for that date, so that I can request stars for past days I forgot to log.

**Acceptance Criteria:**
- Given I'm on the History page with calendar view, when I select a past/today day, then a "Request Stars" button appears
- When I click "Request Stars", a modal opens showing only bonus quests with the date locked
- I select a quest, write a required note, and submit
- The request is created with `source: "child_request"`, `status: "pending"`, `created_at` = selected date
- Duplicate prevention (same quest+day) and rate limiting apply (reuse existing logic from `RequestStarsModal`)

## Architecture

```
Server Page (fetches quests, children)
  → UnifiedActivityList (new optional props: quests, children, currentUserId, familyId)
    → CalendarView (unchanged)
    → "Add Record" button (appears below calendar when date selected)
    → Empty state CTA (when selected day has no records)
    → AddRecordModal (NEW - role-parameterized modal)
        → ModalFrame (reused)
        → Parent mode: child selector + all quest types + multiplier + optional note
        → Child mode: bonus quests only + required note
        → typedInsert → star_transactions
        → router.refresh() on success
```

## Implementation

### Slice 1: Parent — Add Record from Calendar

#### 1.1 Extend types — `types/activity.ts`

Add optional props to `UnifiedActivityListProps`:
```typescript
quests?: Database["public"]["Tables"]["quests"]["Row"][];
children?: Database["public"]["Tables"]["users"]["Row"][];
currentUserId?: string;
familyId?: string;
```

#### 1.2 Create `components/shared/AddRecordModal.tsx` (NEW)

A single modal component parameterized by `role`:

**Props:** `date`, `role`, `locale`, `quests`, `children?`, `currentUserId`, `familyId`, `onClose`, `onSuccess`

**Parent mode:**
- Child selector grid (auto-select if only 1 child)
- Quest grid grouped by type (bonus / duty / violation) — reuse `getQuestName()` from `lib/localization.ts`
- Multiplier slider (1-10x, shown when quest selected)
- Optional parent note textarea
- Submit → `typedInsert(supabase, "star_transactions", { source: "parent_record", status: "approved", created_at: selectedDate + currentTime, reviewed_by: currentUserId, reviewed_at: ... })`

**Child mode:** (implemented in Slice 2)

Uses `ModalFrame` with `maxWidth="lg"`, `stickyHeader={true}` for scrollable quest list.

#### 1.3 Modify `components/shared/UnifiedActivityList.tsx`

- Accept new optional props (`quests`, `children`, `currentUserId`, `familyId`)
- Add state: `showAddRecordModal: boolean`
- Show "➕ Add Record" / "➕ Request Stars" button below the CalendarView (in the sticky left column) when:
  - A date is selected (`filterDate` is set)
  - The date is not in the future
  - `quests` prop is provided (feature is enabled)
- Also show a CTA button in the calendar empty state (when `groupedByDate.length === 0` and `filterDate` is set)
- Render `AddRecordModal` when `showAddRecordModal` is true

#### 1.4 Modify parent activity page — `app/[locale]/(parent)/admin/activity/page.tsx`

Add two queries (parallel with existing):
- Fetch children: `adminClient.from("users").select("*").eq("family_id", ...).eq("role", "child")`
- Fetch active quests: `supabase.from("quests").select("*").eq("family_id", ...).eq("is_active", true)`

Pass to `UnifiedActivityList`:
```tsx
<UnifiedActivityList
  activities={sortedActivities} locale={locale} role="parent"
  quests={quests || []} children={children || []}
  currentUserId={user.id} familyId={user.family_id!}
/>
```

#### 1.5 Add i18n keys — `messages/en.json` and `messages/zh-CN.json`

Under `"activity"`:
- `addRecord` / `添加记录`
- `requestStars` / `申请星星`
- `addRecordForDate` / `为 {date} 添加记录`
- `requestStarsForDate` / `为 {date} 申请星星`
- `selectChild` / `选择孩子`
- `selectQuest` / `选择任务`
- `parentNote` / `备注（可选）`
- `childNoteRequired` / `请描述你做了什么`
- `recordCreated` / `记录创建成功！`
- `requestSubmitted` / `申请已提交！等待审批。`
- `noQuestsAvailable` / `暂无可用任务`
- `cannotRecordFuture` / `不能为未来的日期添加记录`
- `duplicatePending` / `你已经为这个任务在这一天提交过待审批申请了`
- `rateLimited` / `请求太频繁，请稍后再试`

### Slice 2: Child — Request Stars from Calendar

#### 2.1 Add child mode to `AddRecordModal`

- Shows only bonus quests (filtered before passing to modal)
- Required note field (validates non-empty)
- Duplicate prevention: check for existing pending request for same quest + same day (reuse logic from `RequestStarsModal.tsx:72-124`)
- Rate limiting: max 2 requests/min, max 1 per quest per 2 min
- Submit → `typedInsert(supabase, "star_transactions", { source: "child_request", status: "pending" })`

#### 2.2 Modify child history page — `app/[locale]/(child)/app/history/page.tsx`

Add query for bonus quests:
```typescript
const { data: quests } = await supabase
  .from("quests")
  .select("*")
  .eq("family_id", user.family_id!)
  .eq("is_active", true)
  .eq("type", "bonus");
```

Pass to `UnifiedActivityList`:
```tsx
<UnifiedActivityList
  activities={sortedActivities} locale={locale} role="child"
  currentChildId={user.id}
  quests={quests || []} currentUserId={user.id} familyId={user.family_id!}
/>
```

## Files to modify/create

| File | Change |
|------|--------|
| `types/activity.ts` | Add `quests?`, `children?`, `currentUserId?`, `familyId?` to `UnifiedActivityListProps` |
| `components/shared/AddRecordModal.tsx` | **NEW** — Role-parameterized modal |
| `components/shared/UnifiedActivityList.tsx` | Accept new props, add "Add Record" button + modal state |
| `app/[locale]/(parent)/admin/activity/page.tsx` | Fetch quests + children, pass as props |
| `app/[locale]/(child)/app/history/page.tsx` | Fetch bonus quests, pass as props |
| `messages/en.json` | Add i18n keys under `activity` |
| `messages/zh-CN.json` | Add i18n keys under `activity` |
| `__tests__/components/shared/AddRecordModal.test.tsx` | **NEW** — Full test coverage |
| `__tests__/components/shared/UnifiedActivityList.test.tsx` | Add tests for add-record button + modal integration |

## Key patterns to reuse

- `typedInsert()` from `lib/supabase/helpers.ts` — insert star_transactions
- `getQuestName()` from `lib/localization.ts` — bilingual quest names
- `getTodayString()` from `lib/date-utils.ts` — today's date string
- `ModalFrame` from `components/ui/ModalFrame.tsx` — modal wrapper
- Duplicate prevention logic from `components/child/RequestStarsModal.tsx:72-124`
- Quest type grouping pattern from `components/admin/QuickRecordForm.tsx`

## Verification

1. `npm test -- AddRecordModal.test.tsx` — all new tests pass
2. `npm test -- UnifiedActivityList.test.tsx` — existing + new tests pass
3. `npm test` — full suite passes, no regressions
4. `npm run build` — production build succeeds
5. Manual: Parent activity page → calendar → select day → "Add Record" → create record → verify it appears
6. Manual: Child history page → switch to calendar → select day → "Request Stars" → submit → verify pending
