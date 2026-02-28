# E2E Testing with Playwright — Implementation Plan & Execution

## Context

StarQuest has 3,050 Jest unit/component tests (~99% coverage) but **zero E2E tests**. No browser automation framework was installed. This plan adds comprehensive Playwright E2E testing against the production Supabase environment using demo accounts, with GitHub Actions CI integration.

**Key constraint:** Demo users are READ-ONLY (RLS blocks writes). Write operations tested via existing Jest suite. E2E focuses on navigation, rendering, data display, role-based visibility, i18n, and responsiveness.

---

## Directory Structure

```
e2e/
├── playwright.config.ts              # Projects, webServer, storage state config
├── fixtures/
│   └── auth.fixture.ts               # parentPage / alisaPage / alexanderPage fixtures
├── page-objects/
│   ├── LoginPage.ts
│   ├── AppNavPage.ts
│   ├── ActivitiesPage.ts
│   ├── DashboardPage.ts
│   ├── QuestsPage.ts
│   ├── RewardsPage.ts
│   └── ProfilePage.ts
├── tests/
│   ├── helpers.ts                     # Demo user constants, storage state paths
│   ├── global-setup.ts                # Authenticate 3 demo roles, save storage state
│   ├── global-cleanup.ts              # Teardown (no-op)
│   ├── auth/
│   │   ├── demo-login.spec.ts         # 3 tests: login as parent/alisa/alexander
│   │   ├── login-page.spec.ts         # 2 tests: form rendering, validation
│   │   └── logout.spec.ts             # 1 test: logout redirects to login
│   ├── parent/
│   │   ├── activities.spec.ts         # 3 tests: page, activity list, report button
│   │   ├── dashboard.spec.ts          # 2 tests: children overview, family mgmt
│   │   ├── quests.spec.ts             # 2 tests: all quest types, categories
│   │   ├── rewards.spec.ts            # 2 tests: reward list, star costs
│   │   ├── profile.spec.ts            # 2 tests: levels, credit mgmt
│   │   └── generate-report.spec.ts    # 2 tests: modal opens, period types
│   ├── child/
│   │   ├── activities.spec.ts         # 2 tests: calendar heading, own activities
│   │   ├── dashboard.spec.ts          # 2 tests: balance/level, recent activity
│   │   ├── quests.spec.ts             # 2 tests: bonus only, quest details
│   │   ├── rewards.spec.ts            # 1 test: reward grid with balance
│   │   └── profile.spec.ts            # 1 test: badge wall, level progress
│   └── cross-cutting/
│       ├── navigation.spec.ts         # 3 tests: tab navigation, active tab, logo
│       ├── i18n.spec.ts               # 3 tests: EN→zh, zh→EN, locale login
│       ├── responsive.spec.ts         # 3 tests: mobile, tablet, desktop
│       ├── demo-banner.spec.ts        # 1 test: demo banner visible
│       └── demo-write-block.spec.ts   # 2 tests: child/parent write blocked
└── .auth/                             # gitignored — stored auth states
    ├── parent.json
    ├── alisa.json
    └── alexander.json
```

---

## Implementation Steps (Executed)

### Step 1: Install & Configure Playwright ✅

- Installed `@playwright/test` as dev dependency
- Installed Chromium and WebKit browser binaries
- Created `e2e/playwright.config.ts` with:
  - `baseURL`: `process.env.E2E_BASE_URL || 'http://localhost:3000'`
  - `fullyParallel: true` (demo data is read-only, safe to parallelize)
  - `retries: 2` in CI for network flakiness
  - `webServer`: auto-start `npm run dev` when no `E2E_BASE_URL`
  - Projects: `setup` → `desktop-chrome` (all tests), `mobile-safari` + `tablet` (responsive only)
  - `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`
- Added 4 npm scripts: `e2e`, `e2e:ui`, `e2e:headed`, `e2e:report`
- Updated `.gitignore` with `e2e/.auth/`, `e2e/test-results/`, `e2e/playwright-report/`

### Step 2: Auth Global Setup ✅

- Created `e2e/tests/helpers.ts` — demo user constants with storage state paths
- Created `e2e/tests/global-setup.ts` — authenticates each demo role via DemoRolePicker UI:
  1. Navigate to `/en/login?demo=true`
  2. Click the role card (Parent / Alisa / Alexander)
  3. Wait for redirect to `/en/activities`
  4. Save `storageState` to `e2e/.auth/{role}.json`
- Created `e2e/tests/global-cleanup.ts` — no-op teardown

### Step 3: Auth Fixtures ✅

- Created `e2e/fixtures/auth.fixture.ts` — extends Playwright `test` with:
  - `parentPage`: browser context with `parent.json` storage state
  - `alisaPage`: browser context with `alisa.json` storage state
  - `alexanderPage`: browser context with `alexander.json` storage state

### Step 4: Page Objects ✅

Created 7 page objects in `e2e/page-objects/`:

| Page Object | Key Selectors |
|---|---|
| `LoginPage` | email input, password input, login button, demo button, register link, logo |
| `AppNavPage` | nav element, logo, parent badge, logout button, language switcher, tab getter |
| `ActivitiesPage` | heading, activity list, filter bar, generate report button, stat cards |
| `DashboardPage` | heading, children cards, family section |
| `QuestsPage` | heading, quest groups, category section |
| `RewardsPage` | heading, reward list, balance display |
| `ProfilePage` | heading, levels section, credit section |

### Step 5: Auth Tests ✅ (6 tests, 3 files)

- `demo-login.spec.ts` — login as parent/alisa/alexander → land on activities
- `login-page.spec.ts` — form rendering, HTML required validation
- `logout.spec.ts` — parent logout → redirect to login

### Step 6: Parent Flow Tests ✅ (13 tests, 6 files)

- `activities.spec.ts` — page loads, activity list with items, report button
- `dashboard.spec.ts` — Alisa + Alexander visible, family management
- `quests.spec.ts` — all quest types visible, category management
- `rewards.spec.ts` — reward list, star costs
- `profile.spec.ts` — level config, credit management
- `generate-report.spec.ts` — modal opens, period types shown

### Step 7: Child Flow Tests ✅ (8 tests, 5 files)

- `activities.spec.ts` — Star Calendar heading, own activities
- `dashboard.spec.ts` — balance/level, recent activity
- `quests.spec.ts` — bonus only (no duty/violation), quest details
- `rewards.spec.ts` — reward grid with balance
- `profile.spec.ts` — badge wall, level progress

### Step 8: Cross-Cutting Tests ✅ (12 tests, 5 files)

- `navigation.spec.ts` — 5 tabs navigate, active tab highlighted, logo → activities
- `i18n.spec.ts` — EN→zh-CN, zh-CN→EN, login respects locale
- `responsive.spec.ts` — mobile nav, tablet grid, desktop full nav
- `demo-banner.spec.ts` — demo banner visible
- `demo-write-block.spec.ts` — child star request blocked, parent quick record blocked

### Step 9: GitHub Actions CI ✅

- Created `.github/workflows/e2e.yml`:
  - Triggers on push/PR to `main`
  - Installs deps + Chromium
  - Runs `desktop-chrome` project against production URL
  - Uploads HTML report + screenshots as artifacts
  - Concurrency: cancel-in-progress per branch

### Step 10: Documentation ✅

- Updated `CLAUDE.md` with E2E commands section and E2E structure docs
- Created this plan document

---

## Test Case Inventory (39 total)

| Category | Count | Files |
|---|---|---|
| Auth | 6 | 3 files |
| Parent flows | 13 | 6 files |
| Child flows | 8 | 5 files |
| Cross-cutting | 12 | 5 files |
| **Total** | **39** | **19 files** |

---

## Running Tests

```bash
# Local development (auto-starts dev server)
npm run e2e

# Against production
E2E_BASE_URL=https://starquest-kappa.vercel.app npm run e2e

# Interactive UI mode
npm run e2e:ui

# With visible browser
npm run e2e:headed

# View HTML report
npm run e2e:report

# Run specific test file
npx playwright test --config e2e/playwright.config.ts e2e/tests/auth/demo-login.spec.ts

# Run specific project only
npx playwright test --config e2e/playwright.config.ts --project=desktop-chrome
```

---

## Architecture Decisions

### Why DemoRolePicker UI for Auth Setup (not raw API)
- `verifyOtp` happens in the app's Supabase client context → cookies set correctly by `@supabase/ssr`
- Hard navigation via `window.location.href` handled natively by Playwright's `waitForURL`
- Doubles as integration test of the demo login flow

### Why `fullyParallel: true`
- Demo data is read-only (RLS blocks all writes for demo users)
- No test can modify shared state → safe to run all tests concurrently

### Why No Secrets in CI
- Demo login goes through the public `/api/demo-login` endpoint
- The service role key is server-side only (never exposed to client)
- No env secrets needed in GitHub Actions

### Why Separate Projects for Responsive
- `responsive.spec.ts` matched only by `mobile-safari` and `tablet` projects (not `desktop-chrome`)
- Avoids running viewport-specific assertions on wrong device
- `desktop-chrome` ignores responsive tests via `testIgnore`

---

## Critical Files Modified

| File | Change |
|---|---|
| `package.json` | Added `@playwright/test` + 4 npm scripts |
| `.gitignore` | Added E2E artifact paths |
| `CLAUDE.md` | Added E2E testing section (commands + structure) |

## Critical Files Referenced

| File | Why |
|---|---|
| `app/api/demo-login/route.ts` | Demo auth flow |
| `components/auth/LoginForm.tsx` | DemoRolePicker UI for global setup |
| `lib/demo/demo-users.ts` | Demo role names, emails, redirect paths |
| `components/shared/AppNav.tsx` | Nav tabs, parent badge, logout |
| `app/[locale]/(main)/activities/page.tsx` | Default landing, role-branching |

---

**Last Updated:** 2026-02-27
