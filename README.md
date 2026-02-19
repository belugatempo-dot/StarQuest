# StarQuest | 夺星大闯关

> Complete quests. Earn stars. Unlock rewards. | 闯关夺星，解锁奖励。

A gamified family behavior tracking system that helps children build positive habits through quests, stars, and rewards.

**Brand**: Beluga Tempo | 鲸律

---

## 📋 Project Status

**Current Phase**: Phase 4 - Advanced Features 🚧

### ✅ Completed Features

**Phase 1 - Foundation:**
- [x] Next.js 15 project setup with TypeScript
- [x] Tailwind CSS configuration with custom theme
- [x] Internationalization (English + Simplified Chinese)
- [x] Supabase database schema and RLS policies
- [x] Authentication system (register, login, logout)
- [x] Basic layouts for child and parent views
- [x] Automated testing setup with Jest and React Testing Library

**Phase 2 - Child Features:**
- [x] Star history page with filtering
- [x] Quest list page with categories
- [x] Star request submission
- [x] Reward catalog with affordability check
- [x] Reward redemption requests
- [x] Profile page with level progress and badge wall

**Phase 3 - Parent Features:**
- [x] Parent dashboard with quick actions
- [x] Quick record stars with multiplier
- [x] Approval center (star requests & redemptions with batch actions)
- [x] Quest management (CRUD with categories)
- [x] Reward management (CRUD)
- [x] Level configuration
- [x] Family member management (add/edit/delete children, reset passwords)
- [x] Email-based parent invitation system
- [x] Credit system (borrowing stars, interest tiers, settlements)

**Phase 4 - Advanced Features (In Progress):**
- [x] Unified activity list with calendar view
- [x] Redemption date picker and editing
- [x] Configurable quest categories
- [x] Email reports (weekly/monthly summaries, settlement notices)
- [x] Report preferences settings page
- [x] Database backup system (manual + automated weekly)
- [x] Architecture refactoring (UnifiedActivityList → shared components)
- [x] Comprehensive test coverage (2778 tests, ~99% coverage)
- [x] Demo seed API (fully-populated demo family with 30 days of activity)
- [x] Generate markdown summary reports (on-demand report download from activity page)
- [x] Unified admin dashboard (consolidated parent pages)
- [x] Dark starry night theme (app-wide visual overhaul)
- [x] Child notes and parent responses in activity views
- [x] Redeem reward directly from calendar view
- [x] Collapsible filter panels in activity lists
- [x] UnifiedActivityList hook refactor (useActivityModals, useActivityActions, ActivityActionButtons)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([sign up here](https://supabase.com))

### Installation

1. **Clone and install dependencies**
   ```bash
   cd StarQuest
   npm install
   ```

2. **Set up Supabase**
   - 📖 **完整指南**: 查看 `SETUP_GUIDE.md` 获取详细步骤
   - Follow the guide in `supabase/README.md` or `SETUP_GUIDE.md`
   - Run the migration SQL files in your Supabase project
   - Copy environment variables to `.env.local`

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase and Resend credentials
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Visit http://localhost:3000
   - You'll see the landing page with language switcher

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Internationalization**: next-intl
- **Testing**: Jest + React Testing Library
- **Type Safety**: TypeScript
- **Email**: Resend (transactional emails)
- **Deployment**: Vercel

---

## 📁 Project Structure

```
StarQuest/
├── app/
│   └── [locale]/          # Locale-based routing
│       ├── (auth)/        # Auth pages (login, register)
│       ├── (child)/       # Child view pages
│       └── (parent)/      # Parent/Admin pages
├── components/
│   ├── ui/                # Reusable UI components
│   ├── auth/              # Authentication components
│   ├── child/             # Child-specific components
│   ├── admin/             # Admin-specific components
│   └── shared/            # Cross-role shared components
├── lib/
│   ├── supabase/          # Supabase client configs
│   ├── email/             # Email sending (Resend) and templates
│   ├── reports/           # Report data generation
│   ├── hooks/             # Custom React hooks (useBatchSelection, useActivityFilters, useActivityModals, useActivityActions)
│   ├── api/               # API utilities (cron auth)
│   ├── demo/              # Demo seed system
│   ├── auth.ts            # Auth utilities
│   ├── localization.ts    # Bilingual name helpers
│   ├── date-utils.ts      # Date formatting utilities
│   ├── activity-utils.ts  # Activity list helpers
│   └── batch-operations.ts # Batch approve/reject operations
├── types/
│   ├── database.ts        # Database type definitions
│   └── reports.ts         # Report system types
├── messages/              # i18n translations
│   ├── en.json
│   └── zh-CN.json
├── supabase/
│   └── migrations/        # Database migration files
└── __tests__/             # Test files (2778 tests, 125 suites)
```

---

## 🎨 Design System

### Color Palette

```
Primary (Gold/Stars):  #FFD700
Secondary (Indigo):    #4F46E5
Success (Green):       #10B981
Warning (Orange):      #F59E0B
Danger (Red):          #EF4444
Background:            #F9FAFB
```

### Key Concepts

- **Stars**: Points earned for completing positive behaviors
- **Quests**: Task templates (both positive and negative)
- **Rewards**: Items children can redeem with their stars
- **Levels**: Achievements based on lifetime stars earned

---

## 🧪 Testing

```bash
# Run all tests (2778 tests, 125 suites)
npm test

# Watch mode
npm run test:watch

# Coverage report (~99% statements, branches)
npm run test:coverage
```

See `__tests__/README.md` for detailed testing guide.

---

## 🗄️ Database Backup

### Manual Backup

Create a local pg_dump snapshot before migrations or risky operations:

```bash
# Basic backup
npm run db:backup

# Backup with a label
npm run db:backup -- pre-migration-v2
```

Backup files are saved to `backups/` (gitignored). Only the 2 most recent backups are kept; older files are automatically deleted.

**Requires** `SUPABASE_DB_URL` in `.env.local` — find it in Supabase Dashboard > Settings > Database > Connection string.

### Automated Weekly Backup

A GitHub Actions workflow runs every Sunday at midnight UTC, creating a backup and uploading it as a GitHub Actions artifact (90-day retention). See `.github/workflows/weekly-backup.yml`.

**Setup:** Add `SUPABASE_DB_URL` as a repository secret in GitHub > Settings > Secrets and variables > Actions.

---

## 🎭 Demo

A demo seed API creates a fully-populated demo family with 30 days of realistic activity history, including two children with different behavioral profiles, star transactions, redemptions, and credit system usage.

See `demo.md` for full details including credentials and seed command.

---

## 🌍 Internationalization

The app supports:
- **English (en)** - Default
- **简体中文 (zh-CN)**

Language can be switched via the UI. User language preference is saved in their profile.

---

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their family's data
- Parents have full control, children have limited permissions
- All API calls go through Supabase with automatic auth validation

---

## 📝 Development Roadmap

### Phase 1: Foundation ✅
1. ✅ Project setup, auth, layouts, database schema, testing

### Phase 2: Child Features ✅
2. ✅ Dashboard, quests, star requests, rewards, redemptions, profile

### Phase 3: Parent Features ✅
3. ✅ Dashboard, quick record, approval center, quest/reward/level CRUD
4. ✅ Family management, email-based parent invitations, credit system

### Phase 4: Advanced Features 🚧
5. ✅ Unified activity list, calendar view, redemption date editing
6. ✅ Email reports (weekly/monthly), settlement notices, settings page
7. ✅ Database backup system (manual + weekly GitHub Actions)
8. ✅ Architecture refactoring (UnifiedActivityList → shared components)
9. ✅ Comprehensive test coverage (2778 tests, ~99% coverage)
10. ✅ Demo seed API (realistic demo family with 30 days of activity)
11. ✅ Generate markdown summary reports (on-demand from activity page)
12. ✅ Unified admin dashboard, dark starry night theme
13. ✅ Redeem from calendar, child notes, collapsible filters
14. ✅ UnifiedActivityList hook refactor (useActivityModals, useActivityActions, ActivityActionButtons)
15. PWA support
16. Data export

### Phase 5: Polish & Launch

1. Performance optimization
2. Production hardening

---

## 🤝 Contributing

This is a family project. If you'd like to contribute:

1. Follow the existing code style
2. Write tests for new features
3. Update documentation
4. Ensure all tests pass

---

## 📄 License

Private project - All rights reserved.

---

## 🙏 Acknowledgments

- Design inspired by gamification best practices
- Built with modern web technologies
- Powered by Supabase and Vercel

---

**Made with ❤️ by Beluga Tempo | 鲸律**
