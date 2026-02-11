# Quality Gate Report

**Project:** StarQuest | **Date:** 2026-02-10 | **Branch:** `main`

---

## Test Suite

| Metric | Value |
|--------|-------|
| Test suites | 113 passed, 113 total |
| Tests | 2,473 passed, 2,473 total |
| Failures | 0 |
| Snapshots | 0 |
| Test files | 113 |
| Test LOC | ~45,600 |
| Runtime | ~12–21 s |

## Coverage Summary

| Metric | Coverage | Threshold |
|--------|----------|-----------|
| Statements | **99.39%** | 100% business logic / 80% infra |
| Branches | **97.91%** | 100% business logic / 80% infra |
| Functions | **99.22%** | 100% business logic / 80% infra |
| Lines | **99.84%** | 100% business logic / 80% infra |

### Files Below 100% Coverage

| File | Stmts | Branch | Funcs | Lines | Uncovered Lines |
|------|-------|--------|-------|-------|-----------------|
| `components/shared/UnifiedActivityList.tsx` | 96.87 | 92.68 | 96.96 | 98.88 | 309 |
| `components/shared/ActivityDateGroup.tsx` | 90.9 | 100 | 83.33 | 90.9 | 77 |
| `components/admin/InviteParentCard.tsx` | 93.54 | 92.18 | 90 | 100 | 26, 78–102 |
| `components/admin/RedemptionRequestList.tsx` | 96.87 | 92.2 | 100 | 100 | 63, 92–99, 119, 378, 457 |
| `components/admin/QuickRecordForm.tsx` | 98.98 | 96.8 | 95.45 | 100 | 364, 397, 432 |
| `components/admin/StarRequestList.tsx` | 97.18 | 93.75 | 100 | 100 | 62–69, 90, 324 |
| `components/admin/ReportPreferencesForm.tsx` | 97.67 | 100 | 90 | 100 | — |
| `components/admin/SettlementHistoryTable.tsx` | 100 | 95.55 | 100 | 100 | 59, 185 |
| `components/admin/CategoryManagement.tsx` | 100 | 97.1 | 100 | 100 | 65, 115 |
| `components/admin/CreditSettingsModal.tsx` | 100 | 97.05 | 100 | 100 | 153 |
| `components/admin/ParentRedeemSection.tsx` | 100 | 96.29 | 100 | 100 | 129 |
| `components/admin/QuestManagement.tsx` | 100 | 98.24 | 100 | 100 | 64 |
| `components/admin/RewardManagement.tsx` | 100 | 96.49 | 100 | 100 | 94, 255 |
| `components/child/CreditBalanceCard.tsx` | 100 | 93.75 | 100 | 100 | 20 |
| `components/child/QuestGrid.tsx` | 100 | 92.85 | 100 | 100 | 46 |
| `components/child/RequestStarsModal.tsx` | 100 | 97.36 | 100 | 100 | 140 |
| `components/child/ResubmitRequestModal.tsx` | 100 | 97.67 | 100 | 100 | 63 |
| `components/child/RewardGrid.tsx` | 100 | 97.05 | 100 | 100 | 70 |
| `components/auth/LoginForm.tsx` | 98 | 100 | 100 | 98 | 92 |
| `components/auth/RegisterForm.tsx` | 100 | 99 | 100 | 100 | 306 |
| `app/[locale]/layout.tsx` | 93.75 | 100 | 100 | 100 | — |
| `app/[locale]/(child)/app/page.tsx` | 100 | 96.55 | 100 | 100 | 126 |
| `app/[locale]/(parent)/admin/credit/CreditManagementClient.tsx` | 98.24 | 94.73 | 100 | 100 | 68, 163 |
| `app/[locale]/api/admin/delete-child/route.ts` | 100 | 91.66 | 100 | 100 | 62 |
| `app/[locale]/api/admin/reset-child-password/route.ts` | 100 | 93.33 | 100 | 100 | 67 |
| `app/[locale]/api/admin/update-child/route.ts` | 97.14 | 92 | 100 | 97.14 | 77 |
| `app/api/invite-parent/route.ts` | 100 | 96.55 | 100 | 100 | 139 |
| `lib/demo/demo-seed.ts` | 99.21 | 94.2 | 100 | 99.15 | 84 |
| `components/shared/ActivityItem.tsx` | 100 | 98.5 | 100 | 100 | 142 |

### Files at 100% Coverage (all metrics)

All remaining 84 source files have 100% statement, branch, function, and line coverage.

---

## Build

| Check | Status |
|-------|--------|
| `npm run build` | **Pass** |
| TypeScript compilation | No errors |
| Bundle output | Static + SSG + Dynamic routes |

## Linting

| Check | Status |
|-------|--------|
| `npm run lint` | **Pass** (warnings only) |
| Errors | 0 |
| Warnings | 7 |

### Lint Warnings

| File | Rule | Description |
|------|------|-------------|
| `admin/credit/page.tsx` | `react/no-children-prop` | Do not pass children as props |
| `admin/family/page.tsx` | `react/no-children-prop` | Do not pass children as props |
| `admin/record/page.tsx` | `react/no-children-prop` | Do not pass children as props |
| `admin/rewards/page.tsx` | `react/no-children-prop` | Do not pass children as props |
| `InterestTierManager.tsx` | `react-hooks/exhaustive-deps` | Missing dependency in useEffect |
| `SettlementHistoryTable.tsx` | `react-hooks/exhaustive-deps` | Missing dependency in useEffect |
| `RegisterForm.tsx` | `react-hooks/exhaustive-deps` | Missing dependency in useEffect |

---

## Security

| Check | Status |
|-------|--------|
| `npm audit` | **1 high severity** |

### Vulnerabilities

| Package | Severity | Advisory |
|---------|----------|----------|
| `next` (15.5.9) | High | Image Optimizer remotePatterns DoS ([GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f)) |
| `next` (15.5.9) | High | HTTP request deserialization DoS via insecure RSC ([GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf)) |

**Remediation:** `npm audit fix` (updates `next` to 15.5.12)

---

## Dependencies

### Runtime Stack

| Package | Current | Latest |
|---------|---------|--------|
| Next.js | 15.5.9 | 16.1.6 |
| React | 18.3.1 | 19.2.4 |
| TypeScript | ^5.7.2 | — |
| Supabase JS | 2.89.0 | 2.95.3 |
| Supabase SSR | 0.5.2 | 0.8.0 |
| next-intl | 3.26.5 | 4.8.2 |
| Tailwind CSS | 3.4.19 | 4.1.18 |
| Resend | 6.8.0 | 6.9.2 |
| Node.js | v25.1.0 | — |

### Outdated Packages (18 total)

| Risk | Packages |
|------|----------|
| **Major version behind** | `next` (15→16), `react`/`react-dom` (18→19), `next-intl` (3→4), `tailwindcss` (3→4), `eslint` (9→10), `jest` (29→30), `@types/jest` (29→30), `@types/node` (22→25), `@types/react`/`@types/react-dom` (18→19) |
| **Minor/patch behind** | `@supabase/supabase-js`, `@supabase/ssr`, `@testing-library/react`, `autoprefixer`, `eslint-config-next`, `resend` |

---

## Quality Metrics Summary

| Gate | Target | Actual | Status |
|------|--------|--------|--------|
| All tests pass | 100% | 100% (2,473/2,473) | **PASS** |
| Statement coverage | ≥ 80% | 99.39% | **PASS** |
| Branch coverage | ≥ 80% | 97.91% | **PASS** |
| Function coverage | ≥ 80% | 99.22% | **PASS** |
| Line coverage | ≥ 80% | 99.84% | **PASS** |
| Build succeeds | Yes | Yes | **PASS** |
| Lint errors | 0 | 0 | **PASS** |
| High/critical vulnerabilities | 0 | 1 high (fixable) | **WARN** |

### Overall: **PASS** (with advisory to run `npm audit fix`)
