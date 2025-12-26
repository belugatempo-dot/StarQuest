# StarQuest | 夺星大闯关

> Complete quests. Earn stars. Unlock rewards. | 闯关夺星，解锁奖励。

A gamified family behavior tracking system that helps children build positive habits through quests, stars, and rewards.

**Brand**: Beluga Tempo | 鲸律

---

## 📋 Project Status

**Current Phase**: Phase 2 - Child Features ✅ **COMPLETED**

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
   # Edit .env.local with your Supabase credentials
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
- **Deployment**: Vercel (planned)

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
│   └── admin/             # Admin-specific components
├── lib/
│   ├── supabase/          # Supabase client configs
│   └── auth.ts            # Auth utilities
├── types/
│   └── database.ts        # Database type definitions
├── messages/              # i18n translations
│   ├── en.json
│   └── zh-CN.json
├── supabase/
│   └── migrations/        # Database migration files
├── __tests__/             # Test files
└── hooks/                 # Custom React hooks
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
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

See `__tests__/README.md` for detailed testing guide.

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

### Phase 1: Foundation ✅ COMPLETED
1. ✅ Project setup
2. ✅ Authentication
3. ✅ Basic layouts
4. ✅ Database schema
5. ✅ Testing setup

### Phase 2: Child Features ✅ COMPLETED
7. ✅ Child dashboard with star balance
8. ✅ Quest list and star request submission
9. ✅ Rewards catalog with affordability check
10. ✅ Redemption requests
11. ✅ Activity history with filtering
12. ✅ Profile with level badges and progress

### Phase 3: Parent Features 🚧 NEXT
13. Parent dashboard (basic version done)
14. Quick record stars
15. Approval center (star requests & redemptions)
16. Quest management (CRUD)
17. Reward management (CRUD)
18. Level configuration
19. Family member management

### Phase 4: Advanced Features
19. Level system with animations
20. Family member management
21. Statistics and reports
22. Settings page
23. Email notifications

### Phase 5: Polish & Launch
24. Weekly email reports
25. Invite system
26. PWA support
27. Data export
28. Performance optimization
29. Production deployment

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
