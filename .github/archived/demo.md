# StarQuest Demo

**Production:** https://starquest-kappa.vercel.app

---

## Seed the Demo

The demo seed API creates (or resets) a fully-populated demo family with 30 days of realistic activity history.

```bash
curl -X POST https://starquest-kappa.vercel.app/api/seed-demo \
  -H "Authorization: Bearer $DEMO_SEED_SECRET"
```

> Replace `$DEMO_SEED_SECRET` with the actual token stored in Vercel env vars, or export it in your shell first.

To **reset** the demo, simply run the same command again. It cleans up all existing demo data before re-seeding.

---

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Parent | `demo@starquest.app` | (set via `DEMO_PARENT_PASSWORD` env var) |
| Emma (child) | `emma.demo@starquest.app` | `EmmaDemo123!` |
| Lucas (child) | `lucas.demo@starquest.app` | `LucasDemo123!` |

---

## What Gets Seeded

### Family Setup
- **Family name:** Demo Family
- **45 quests** (duty, bonus, violation across self/family/other scopes)
- **11 rewards** with star costs
- **7 levels** with star thresholds
- **14 quest categories** (Health, Study, Chores, etc.)

### Children

| Child | Level | Locale | Personality | Credit |
|-------|-------|--------|-------------|--------|
| Emma | 3 (~280 lifetime stars) | English | Compliant — low miss rate (10%), 2-4 bonuses/day, rare violations (3%) | Disabled |
| Lucas | 2 (~120 lifetime stars) | Chinese | Learning — higher miss rate (30%), 1-3 bonuses/day, more violations (10%) | Enabled (limit: 100 stars) |

### Activity History (~30 days)
- **Star transactions:** Duty completions & misses, bonus completions, violations, with multipliers
- **Child-requested stars:** Mix of approved, pending, and rejected
- **7 redemptions:** Mix of approved and pending statuses, including one using credit (Lucas)

### Credit System (Lucas only)
- Credit settings with 100-star limit
- Interest tiers configured
- At least one credit transaction

### Report Preferences
- Weekly and monthly reports enabled for the demo parent
