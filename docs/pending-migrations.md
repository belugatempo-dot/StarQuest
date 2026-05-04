# Pending Migrations & Recommendations

## Server-Side Credit Guard (Optional, Low Priority)

**Migration file:** `supabase/migrations/20260427000000_credit_limit_guard.sql`

**Date:** 2026-04-27

**Status:** 🟡 Recommended but not urgent

### What it does

Adds database-level protection against overspending:

1. **`record_credit_usage()`** — Updated to validate:
   - Credit is enabled for the child
   - Requested amount is positive
   - Amount doesn't exceed available credit (minus pending commitments)

2. **`validate_redemption_balance()` trigger** — BEFORE INSERT on redemptions:
   - Only applies to child-initiated (`status='pending'`) requests
   - Checks total pending + new request ≤ spendable_stars
   - Parent quick-redeems (`status='approved'`) bypass (parent authority)

### Why it's optional

The UI already prevents overspending via client-side checks (`computeCreditState` in `RedeemRewardModal.tsx`). This migration is a defense-in-depth layer that blocks:
- Direct Supabase API calls bypassing the UI
- Race conditions (two rapid pending requests)
- Future bugs in redemption code

### Risk assessment

| Concern | Answer |
|---------|--------|
| Breaks existing data? | **No** — only adds function + trigger, no ALTER/DELETE |
| Affects existing redemptions? | **No** — trigger is BEFORE INSERT only (not UPDATE) |
| Affects parent actions? | **No** — parent redeems (`status='approved'`) skip the trigger |
| Reversible? | **Yes** — `DROP TRIGGER check_redemption_balance ON redemptions;` |

### How to apply

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/migrations/20260427000000_credit_limit_guard.sql`
3. Click "Run"
4. Verify: try a normal redemption flow to confirm it still works

### How to verify it works

After applying, you can test in SQL Editor:

```sql
-- Should fail: insert a redemption with stars_spent > spendable for a child
INSERT INTO redemptions (family_id, child_id, reward_id, stars_spent, status)
VALUES ('your-family-id', 'your-child-id', 'any-reward-id', 999999, 'pending');
-- Expected: ERROR "Insufficient stars..."
```

---

*Last updated: 2026-04-27*
