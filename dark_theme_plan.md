# Dark Theme Migration Plan

## Context
The app background is too white/bright. The CalendarView already has the perfect dark starry night aesthetic — the rest of the app should match that modern dark feel. **CalendarView.tsx must NOT be changed.**

## Strategy
Layer changes from global → local: CSS variables first (biggest impact, smallest diff), then Tailwind tokens, then systematic class replacements.

### Color Mapping Reference

| Old | New |
|-----|-----|
| `bg-background` (#F9FAFB) | `bg-background` (#0f172a) — just change the token |
| `bg-white` | `dark-card` (new CSS class: rgba(30,58,95,0.5) + border) |
| `.glass-card` (white 95%) | `.glass-card` (dark translucent) |
| `bg-gray-50` | `bg-white/5` |
| `bg-gray-100` | `bg-white/10` |
| `bg-gray-200` | `bg-white/15` |
| `text-gray-900` | `text-white` |
| `text-gray-800` | `text-slate-200` |
| `text-gray-700` | `text-slate-300` |
| `text-gray-600` | `text-slate-400` |
| `text-gray-500` | `text-slate-400` |
| `text-gray-400` | `text-slate-500` |
| `border-gray-200` | `border-white/10` |
| `border-gray-300` | `border-white/20` |
| `hover:bg-gray-*` | `hover:bg-white/{5,10,15,20}` |
| `bg-blue-50/100` | `bg-blue-500/10` or `bg-blue-500/15` |
| `bg-red-50` | `bg-red-500/10` |
| `bg-green-50` | `bg-green-500/10` |
| `bg-yellow-50` | `bg-yellow-500/10` |
| `bg-purple-50` | `bg-purple-500/10` |
| `text-blue-700` | `text-blue-300` |
| `text-red-700` | `text-red-300` |
| `text-green-700` | `text-green-300` |
| `text-purple-600/700` | `text-purple-300` |
| `border-blue-200/300` | `border-blue-500/30` |
| `shadow-md` on white cards | `shadow-lg` (optional, darker shadows more visible) |

---

## Phase 0: Foundation (3 files) — Biggest impact

### `app/globals.css`
- Change `:root` CSS variables to dark values:
  - `--foreground-rgb: 0, 0, 0` → `--foreground-rgb: 226, 232, 240` (slate-200)
  - `--background-start-rgb: 249, 250, 251` → `--background-start-rgb: 15, 23, 42` (night-deep #0f172a)
  - `--background-end-rgb: 255, 255, 255` → `--background-end-rgb: 30, 58, 95` (night-swirl #1e3a5f)
- Update `.glass-card`:
  ```css
  .glass-card {
    background: rgba(30, 58, 95, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  ```
- Add new utilities:
  ```css
  .dark-card {
    background: rgba(30, 58, 95, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .dark-surface {
    background: #162a46;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .dark-input {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e2e8f0;
  }
  .dark-input:focus {
    border-color: #4F46E5;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.3);
  }
  ```

### `tailwind.config.ts`
- Change `background: "#F9FAFB"` → `"#0f172a"`
- Add new tokens:
  ```typescript
  surface: "#162a46",
  "surface-light": "#1e3a5f",
  ```

### `app/[locale]/layout.tsx`
- Change `className="light"` → `"dark"`, `colorScheme: 'dark'`

**Effect**: Both parent and child layouts already use `bg-background`, so they go dark automatically.

---

## Phase 1: Navigation (3 files)

### `components/admin/AdminNav.tsx`
- `bg-white shadow-md` → `bg-surface border-b border-white/10`
- Tab inactive: `bg-gray-100 text-gray-600` → `bg-white/5 text-slate-400`
- Text: `text-gray-600` → `text-slate-400`
- Logout: `text-gray-600 hover:text-gray-900` → `text-slate-400 hover:text-white`

### `components/child/ChildNav.tsx`
- Same pattern as AdminNav
- `bg-white shadow-md` → `bg-surface border-b border-white/10`
- Inactive tabs/text: gray → slate-400/white

### `components/admin/SettingsDrawer.tsx`
- Drawer panel: `bg-white shadow-xl` → `bg-surface shadow-xl border-l border-white/10`
- Close button: `text-gray-400 hover:text-gray-600` → `text-slate-500 hover:text-white`
- Text colors: gray-600/700/900 → slate-400/300/white

---

## Phase 2: Shared Components (6 files)

### `components/ui/ModalFrame.tsx`
- Modal container: `bg-white rounded-lg shadow-xl` → `dark-surface rounded-lg shadow-xl`
- Header: `sticky top-0 bg-white border-b` → `sticky top-0 bg-surface border-b border-white/10`
- Close: `text-gray-400 hover:text-gray-600` → `text-slate-500 hover:text-white`
- Error box: `bg-red-50 border border-red-200 text-red-700` → `bg-red-500/10 border border-red-500/30 text-red-300`

### `components/ui/LanguageSwitcher.tsx`
- Inactive: `bg-gray-200 text-gray-700 hover:bg-gray-300` → `bg-white/10 text-slate-400 hover:bg-white/20`

### `components/shared/ActivityFilterBar.tsx`
- Container: `bg-white rounded-lg shadow-md p-6` → `dark-card rounded-lg shadow-md p-6`
- Toggle buttons inactive: `bg-gray-100 hover:bg-gray-200` → `bg-white/5 hover:bg-white/10 text-slate-400`
- Labels: `text-gray-700` → `text-slate-300`
- Date inputs: `border border-gray-300 rounded-lg` → `dark-input rounded-lg`
- Results text: `text-gray-600` → `text-slate-400`

### `components/shared/BatchActionBar.tsx`
- Bar: `bg-white border-t-2 border-purple-300` → `bg-surface border-t-2 border-purple-500/50`
- Text: `text-purple-700` → `text-purple-300`
- Clear button: `bg-gray-200 text-gray-700 hover:bg-gray-300` → `bg-white/10 text-slate-400 hover:bg-white/20`
- Reject modal: `bg-white rounded-lg shadow-xl` → `dark-surface rounded-lg shadow-xl`
- Textarea: `border border-gray-300` → `dark-input`
- Cancel btn: `border border-gray-300 text-gray-700 hover:bg-gray-50` → `border border-white/20 text-slate-400 hover:bg-white/5`

### `components/shared/ActivityDateGroup.tsx`
- Card: `bg-white rounded-lg shadow-md` → `dark-card rounded-lg shadow-md`

### `components/shared/ActivityItem.tsx`
- Conditional card colors:
  - Default: `bg-gray-50 border-gray-200` → `bg-white/5 border-white/10`
  - Redemption: `border-purple-200 bg-purple-50` → `border-purple-500/30 bg-purple-500/10`
  - Credit: `border-blue-200 bg-blue-50` → `border-blue-500/30 bg-blue-500/10`
  - Calendar positive: `border-green-200 bg-green-50` → `border-green-500/30 bg-green-500/10`
  - Calendar negative: `border-red-200 bg-red-50` → `border-red-500/30 bg-red-500/10`
  - Calendar pending: `border-yellow-200 bg-yellow-50` → `border-yellow-500/30 bg-yellow-500/10`
  - Calendar rejected: `border-gray-300 bg-gray-50` → `border-white/10 bg-white/5`
- Pending/Rejected translucent colors (warning/5, danger/5): keep — already work on dark
- Text: `text-gray-*` → `text-slate-*` or `text-white`
- Action buttons: `bg-blue-100 text-blue-700` → `bg-blue-500/20 text-blue-300`, `bg-red-100 text-red-700` → `bg-red-500/20 text-red-300`
- Checkbox border: `border-gray-300` → `border-white/30`

---

## Phase 3: Auth Pages (6 files)

### Pages
- `app/[locale]/(auth)/login/page.tsx`
- `app/[locale]/(auth)/register/page.tsx`
- `app/[locale]/(auth)/auth/verify-email/page.tsx`
- `app/[locale]/(auth)/auth/confirmed/page.tsx`

Pattern: `bg-white` card → `bg-surface`, gradient bg → `from-night-cosmic/60 to-background`

### Form Components
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`

Pattern: input borders → `border-white/20`, labels `text-gray-700` → `text-slate-300`

---

## Phase 4: Admin Page Headers & Dashboard (8 files)
- `app/[locale]/(parent)/admin/dashboard/page.tsx` — stat cards `bg-white` → `dark-card`, children overview → `text-white`/`text-slate-*`
- `app/[locale]/(parent)/admin/quests/page.tsx` — header text colors
- `app/[locale]/(parent)/admin/rewards/page.tsx` — header text colors
- `app/[locale]/(parent)/admin/levels/page.tsx` — header text colors
- `app/[locale]/(parent)/admin/record/page.tsx` — header text colors
- `app/[locale]/(parent)/admin/activity/page.tsx` — stat card text colors (glass-card auto-updated in Phase 0)
- `app/[locale]/(parent)/admin/children/[childId]/page.tsx` — card and text colors
- `app/[locale]/(parent)/admin/credit/page.tsx` — text colors

Headers with `from-secondary/20 to-primary/20` gradients are translucent — they look fine on dark bg. Just update text colors inside them.

---

## Phase 5: Admin Components (~15 files)
Apply universal card + text mapping to:
- `components/admin/QuestManagement.tsx`
- `components/admin/CategoryManagement.tsx`
- `components/admin/RewardManagement.tsx` — also update CATEGORY_COLORS from `bg-blue-100 text-blue-700` → `bg-blue-500/15 text-blue-300` etc.
- `components/admin/LevelManagement.tsx`
- `components/admin/QuickRecordForm.tsx`
- `components/admin/InviteParentCard.tsx`
- `components/admin/FamilyMemberList.tsx`
- `components/admin/ApprovalTabs.tsx`
- `components/admin/StarRequestList.tsx`
- `components/admin/RedemptionRequestList.tsx`
- `components/admin/ParentRedeemSection.tsx`
- `components/admin/ReportPreferencesForm.tsx`
- `components/admin/InterestTierManager.tsx`
- `components/admin/SettlementHistoryTable.tsx`
- `app/[locale]/(parent)/admin/credit/CreditManagementClient.tsx`

---

## Phase 6: Admin Modals (~10 files)
ModalFrame handles the chrome (updated in Phase 2). These need input field + alert box updates:
- `components/admin/QuestFormModal.tsx`
- `components/admin/RewardFormModal.tsx`
- `components/admin/LevelFormModal.tsx`
- `components/admin/CreditSettingsModal.tsx`
- `components/admin/AddChildModal.tsx`
- `components/admin/EditChildModal.tsx`
- `components/admin/EditParentModal.tsx`
- `components/admin/ResetPasswordModal.tsx`
- `components/admin/EditTransactionModal.tsx`
- `components/admin/EditRedemptionModal.tsx`

Pattern: inputs `border border-gray-300` → `dark-input`, select/textarea same, alert boxes → dark variants

---

## Phase 7: Child Components (~10 files)
- `components/child/QuestGrid.tsx`
- `components/child/RewardGrid.tsx`
- `components/child/ChildRedemptionList.tsx`
- `components/child/CreditBalanceCard.tsx`
- `components/child/CreditUsageWarning.tsx`
- `components/child/RequestStarsModal.tsx`
- `components/child/RedeemRewardModal.tsx`
- `components/child/ResubmitRequestModal.tsx`
- `app/[locale]/(child)/app/profile/page.tsx`
- `app/[locale]/(child)/app/history/page.tsx`
- `app/[locale]/(child)/app/page.tsx`
- `app/[locale]/(child)/app/quests/page.tsx`
- `app/[locale]/(child)/app/rewards/page.tsx`

---

## Phase 8: Utility Functions (1 file)
`lib/activity-utils.ts` — badge class definitions:
- `getStatusBadge`: `bg-blue-100 text-blue-700 border-blue-300` → `bg-blue-500/15 text-blue-300 border-blue-500/30`; `bg-gray-100 text-gray-600 border-gray-300` → `bg-white/10 text-slate-400 border-white/20`
- `getTypeBadge`: `bg-yellow-100 text-yellow-700` → `bg-yellow-500/15 text-yellow-300`; etc.

---

## Phase 9: Remaining Files
- `app/[locale]/page.tsx` (landing page)
- `components/shared/AddRecordModal.tsx`
- `components/shared/UnifiedActivityList.tsx`

---

## DO NOT TOUCH
- `components/admin/CalendarView.tsx`
- CSS classes: `.starry-bg`, `.night-header`, `.net-stars-card`, `.night-date-header`, `.cosmic-border`, `.star-glow`

---

## Verification
After each phase:
1. `npm run build` — no errors
2. `npm test` — 2600 tests pass (fix class-name assertions in test files as needed)
3. Visual check at `localhost:3003`:
   - After Phase 0: Background is dark, CalendarView still perfect
   - After Phase 1: Nav bars dark
   - After Phase 2: Modals + filters dark
   - After Phase 3: Auth pages dark
   - Full run after all phases: everything consistent

**Total: ~67 source files + test assertion fixes**

---

## Test Files That May Need Assertion Updates
Tests that check for class names like `bg-white`, `text-gray-600`, etc.:
- `__tests__/components/admin/StarRequestList.test.tsx`
- `__tests__/components/admin/RedemptionRequestList.test.tsx`
- `__tests__/components/admin/RewardManagement.test.tsx`
- `__tests__/components/child/RewardGrid.test.tsx`
- `__tests__/components/child/QuestGrid.test.tsx`
- `__tests__/components/shared/ActivityItem.test.tsx`
- `__tests__/components/shared/ActivityFilterBar.test.tsx`
- `__tests__/components/shared/AddRecordModal.test.tsx`
- `__tests__/lib/activity-utils.test.ts`

Most tests use `@testing-library/react` and query by role/text, not class names, so the majority should pass without changes.
