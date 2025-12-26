# ⭐ StarQuest Product Documentation

**Version:** 1.0.0
**Last Updated:** 2025-12-25

---

## 📖 Table of Contents

1. [Product Overview](#product-overview)
2. [Key Features](#key-features)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Quest System](#quest-system)
5. [Reward System](#reward-system)
6. [Leveling System](#leveling-system)
7. [Technical Architecture](#technical-architecture)
8. [Getting Started](#getting-started)
9. [User Workflows](#user-workflows)
10. [Database Schema](#database-schema)
11. [API Reference](#api-reference)
12. [Internationalization](#internationalization)

---

## 📱 Product Overview

### What is StarQuest?

StarQuest is a **family gamification platform** that transforms daily responsibilities and good behaviors into an engaging quest-based reward system. Parents can assign quests (duties, bonus tasks, and violations), track their children's progress, and manage a star-based economy that motivates positive behavior.

### Vision

To make family task management fun, engaging, and educational by applying game mechanics to real-world responsibilities.

### Target Audience

- **Primary Users:** Parents with children aged 5-15
- **Secondary Users:** Children who want to earn rewards
- **Use Cases:** Chore management, behavior tracking, educational goals, habit building

---

## 🎯 Key Features

### For Parents (Admin Role)

1. **Quick Record**
   - Instantly record star transactions for children
   - Three convenient grouping modes:
     - **Duties:** Daily responsibilities (hygiene, homework, chores, etc.)
     - **Bonuses:** Extra credit activities (helping others, self-improvement)
     - **Violations:** Rule breaking or negative behaviors
   - Custom descriptions and notes
   - Star adjustment controls (+/-)

2. **Approval Center**
   - Review and approve/reject child requests
   - Two request types:
     - **Star Requests:** Children claim completed bonus quests
     - **Redemption Requests:** Children request rewards
   - Add approval/rejection notes
   - Track request history

3. **Quest Management**
   - Create, edit, and delete quest templates
   - 36 pre-configured quest templates
   - Quest classification by:
     - **Type:** duty, bonus, violation
     - **Scope:** self, family, other
     - **Category:** learning, chores, hygiene, health, social, etc.
   - Set star values and daily limits

4. **Reward Management**
   - Create tiered reward catalog
   - 11 pre-configured reward templates
   - Categories: screen time, toys, activities, treats
   - Set star costs and availability

5. **Level Management**
   - Design progression system with 7 levels
   - Set star thresholds for each level
   - Create custom badges and achievements

6. **Family Management**
   - Add/remove family members
   - Assign roles (parent/child)
   - View family-wide statistics

7. **Reports & Analytics**
   - Star transaction history
   - Child progress reports
   - Behavioral insights

### For Children

1. **Quest Board**
   - View available bonus quests
   - Grouped by scope:
     - **For Myself:** Self-improvement tasks
     - **For Family:** Helping family members
     - **For Others:** Community and kindness
   - Request star approval for completed quests
   - Add optional notes

2. **Reward Catalog**
   - Browse available rewards
   - Filter by category and affordability
   - Request redemptions
   - Track request status

3. **Star Balance**
   - Real-time star count
   - Transaction history (earned, deducted, approved)
   - Visual progress indicators

4. **Level Progression**
   - Current level display
   - Next level requirements
   - Achievement badges

---

## 👥 User Roles & Permissions

### Parent Role
- **Permissions:**
  - ✅ Full CRUD operations on quests, rewards, levels
  - ✅ Record star transactions
  - ✅ Approve/reject requests
  - ✅ View all family data
  - ✅ Manage family members
  - ✅ Access admin dashboard
- **Restrictions:**
  - ❌ Cannot request stars (can only record)

### Child Role
- **Permissions:**
  - ✅ View bonus quests only (duties and violations hidden)
  - ✅ Request star approval for completed bonus quests
  - ✅ View reward catalog
  - ✅ Request reward redemptions
  - ✅ View own transaction history
  - ✅ View own level and progress
- **Restrictions:**
  - ❌ Cannot see duties or violations in quest list
  - ❌ Cannot approve own requests
  - ❌ Cannot modify quests or rewards
  - ❌ Cannot access admin features

---

## 🗺️ Quest System

### Quest Classification (Type × Scope)

#### Quest Types

1. **Duty** (日常任务)
   - Daily responsibilities and expected behaviors
   - Typically negative star values (deductions for non-completion)
   - Examples: brush teeth, do homework, clean room
   - **Visibility:** Hidden from children (parent records only)

2. **Bonus** (奖励任务)
   - Extra credit activities that earn stars
   - Always positive star values
   - Examples: help sibling, read book, exercise
   - **Visibility:** Shown to children (can request approval)

3. **Violation** (违规行为)
   - Rule breaking or negative behaviors
   - Negative star values (deductions)
   - Examples: fighting, lying, breaking rules
   - **Visibility:** Hidden from children (parent records only)

#### Quest Scopes

1. **Self** (个人)
   - Activities that benefit the child themselves
   - Examples: homework, personal hygiene, reading
   - Teaches self-responsibility

2. **Family** (家庭)
   - Activities that help family members
   - Examples: help with chores, care for sibling
   - Promotes family cooperation

3. **Other** (他人)
   - Activities that help community or others
   - Examples: volunteer, help neighbor, donate
   - Builds social responsibility

### Pre-configured Quest Templates (36 Total)

#### Duties (11) - All scope: self
- ✅ Brush teeth twice (hygiene)
- ✅ Wash face and hands (hygiene)
- ✅ Complete homework (learning)
- ✅ Practice reading (learning)
- ✅ Clean room (chores)
- ✅ Make bed (chores)
- ✅ Put away toys (chores)
- ✅ Eat vegetables (health)
- ✅ Bedtime routine (hygiene)
- ✅ Morning routine (hygiene)
- ✅ Practice instrument (learning)

#### Bonus Quests by Scope

**For Myself (6):**
- Extra reading time (learning)
- Exercise 20 minutes (health)
- Learn new skill (learning)
- Practice handwriting (learning)
- Organize belongings (chores)
- Complete extra homework (learning)

**For Family (7):**
- Help cook meal (chores)
- Care for sibling (family)
- Do dishes (chores)
- Fold laundry (chores)
- Take out trash (chores)
- Water plants (chores)
- Help parent with task (family)

**For Others (5):**
- Help neighbor (social)
- Donate old toys (social)
- Volunteer activity (social)
- Kind act for stranger (social)
- Teach friend something (social)

#### Violations (7) - All scope: self
- Fighting with sibling (behavior)
- Not listening to parent (behavior)
- Lying (behavior)
- Breaking toys (behavior)
- Wasting food (behavior)
- Using phone without permission (behavior)
- Disrespectful language (behavior)

### Star Value Guidelines

| Quest Type | Typical Star Range | Examples |
|------------|-------------------|----------|
| Daily Duties | -3 to -5 | Brush teeth (-3), Do homework (-5) |
| Hygiene | -3 to -5 | Wash hands (-3), Bedtime routine (-5) |
| Learning | -5 to -8 | Complete homework (-5), Reading practice (-5) |
| Chores | -3 to -8 | Make bed (-3), Clean room (-8) |
| Bonus (Self) | +3 to +8 | Extra reading (+5), Exercise (+5) |
| Bonus (Family) | +5 to +10 | Help cook (+8), Care for sibling (+10) |
| Bonus (Other) | +8 to +15 | Volunteer (+15), Help neighbor (+10) |
| Violations | -5 to -15 | Fighting (-10), Lying (-15) |

---

## 🎁 Reward System

### Reward Categories

1. **Screen Time** (屏幕时间)
   - Examples: 30min tablet, 1hr TV, 30min video games
   - Cost: 10-30 stars

2. **Toys** (玩具)
   - Examples: Small toy, Action figure, Board game
   - Cost: 50-150 stars

3. **Activities** (活动)
   - Examples: Park trip, Movie night, Sleepover
   - Cost: 20-80 stars

4. **Treats** (零食)
   - Examples: Ice cream, Candy bar, Special dessert
   - Cost: 10-25 stars

5. **Other** (其他)
   - Custom rewards defined by family
   - Cost: Variable

### Pre-configured Reward Templates (11)

| Reward | Category | Cost | Description |
|--------|----------|------|-------------|
| 30min Tablet | Screen Time | 15★ | Tablet time on weekend |
| 1hr TV | Screen Time | 20★ | Choose TV show |
| 30min Video Games | Screen Time | 20★ | Gaming session |
| Small Toy | Toys | 50★ | Small toy from store |
| Ice Cream | Treats | 15★ | Ice cream outing |
| Movie Night | Activities | 30★ | Family movie with snacks |
| Stay Up 30min Late | Activities | 25★ | Extended bedtime |
| Special Dessert | Treats | 10★ | Favorite dessert |
| Park Trip | Activities | 40★ | Special park outing |
| Book of Choice | Toys | 35★ | Choose new book |
| Board Game | Toys | 80★ | New board game |

### Redemption Process

1. **Child Requests:** Browse catalog and submit redemption request
2. **Parent Reviews:** Sees request in Approval Center
3. **Parent Decides:** Approve (deducts stars) or Reject (with reason)
4. **Fulfillment:** Parent fulfills reward in real life
5. **Status Update:** Request marked as fulfilled

---

## 📈 Leveling System

### Level Progression (7 Levels)

| Level | Name | Star Threshold | Badge | Perks |
|-------|------|----------------|-------|-------|
| 1 | Beginner | 0 | 🌱 | Starting level |
| 2 | Explorer | 50 | 🔍 | Basic rewards unlocked |
| 3 | Achiever | 150 | ⭐ | Bonus quest multiplier 1.2x |
| 4 | Champion | 300 | 🏆 | Premium rewards unlocked |
| 5 | Hero | 500 | 🦸 | Special privileges |
| 6 | Master | 800 | 👑 | VIP rewards |
| 7 | Legend | 1200 | 💎 | All rewards + custom perks |

### Progression Mechanics

- **Cumulative Stars:** Levels based on total stars earned (not current balance)
- **No Level Loss:** Children cannot lose levels
- **Visual Feedback:** Progress bar showing stars to next level
- **Achievements:** Badges displayed in profile

---

## 🏗️ Technical Architecture

### Tech Stack

**Frontend:**
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Hooks
- **Internationalization:** next-intl

**Backend:**
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **API:** Supabase Client SDK
- **Functions:** PostgreSQL stored procedures

**Hosting:**
- **Frontend:** Vercel (recommended)
- **Database:** Supabase Cloud
- **CDN:** Vercel Edge Network

### Architecture Patterns

1. **Server-Side Rendering (SSR)**
   - Locale-based routing
   - SEO optimization
   - Fast initial page load

2. **Row Level Security (RLS)**
   - Database-level access control
   - Family-scoped data isolation
   - Role-based permissions

3. **Optimistic UI Updates**
   - Instant feedback for user actions
   - Background sync with database
   - Error handling with rollback

4. **Real-time Subscriptions**
   - Live star balance updates
   - Instant approval notifications
   - Family activity feed

---

## 🚀 Getting Started

### For Parents

1. **Create Account**
   - Visit `/register`
   - Enter email, password (with confirmation)
   - Provide family name and your name
   - System creates family with 36 quests, 11 rewards, 7 levels

2. **Add Children**
   - Go to Family Management
   - Click "Add Child"
   - Enter child's name and create account
   - Child receives login credentials

3. **Customize Quests**
   - Review 36 default quests
   - Edit star values to fit your family
   - Add custom quests
   - Set daily limits

4. **Configure Rewards**
   - Review 11 default rewards
   - Adjust star costs
   - Add family-specific rewards
   - Set availability

5. **Start Recording**
   - Use Quick Record for daily activities
   - Review and approve child requests
   - Track progress in Reports

### For Children

1. **Login**
   - Use credentials provided by parent
   - View dashboard showing star balance and level

2. **Complete Quests**
   - Check Quest Board for available bonuses
   - Complete tasks in real life
   - Request approval with note explaining what you did

3. **Earn Stars**
   - Wait for parent approval
   - Watch star balance increase
   - See level progress

4. **Redeem Rewards**
   - Browse Reward Catalog
   - Request redemption when you have enough stars
   - Wait for parent approval
   - Enjoy your reward!

---

## 🔄 User Workflows

### Workflow 1: Parent Records Daily Duty

```
1. Parent opens Quick Record
2. Selects child from dropdown
3. Clicks "Duties" tab
4. Finds "Complete homework" quest
5. Adds optional note: "Finished math worksheet"
6. Clicks record
7. Stars deducted from child's balance
8. Transaction appears in child's history
```

### Workflow 2: Child Requests Bonus Stars

```
1. Child opens Quest Board
2. Browses "For Family" section
3. Completes "Help cook meal" in real life
4. Clicks on quest in app
5. Adds note: "I helped make dinner tonight"
6. Clicks "Request Approval"
7. Parent sees request in Approval Center
8. Parent approves with note: "Great job helping!"
9. Stars added to child's balance
10. Child receives notification
```

### Workflow 3: Child Redeems Reward

```
1. Child opens Reward Catalog
2. Filters by "Activities"
3. Finds "Movie Night" (30 stars)
4. Checks balance (has 45 stars)
5. Clicks "Request Redemption"
6. Parent sees request in Approval Center
7. Parent approves
8. 30 stars deducted from child's balance
9. Parent fulfills reward (family movie night)
10. Parent marks request as "Fulfilled"
```

### Workflow 4: Parent Handles Violation

```
1. Child breaks rule (e.g., fighting)
2. Parent opens Quick Record
3. Clicks "Violations" tab
4. Selects "Fighting with sibling"
5. Adds note: "Hit sister during argument"
6. Stars deducted (-10)
7. Transaction logged
8. Parent discusses behavior with child
```

---

## 🗄️ Database Schema

### Core Tables

#### families
- `id` UUID (PK)
- `name` TEXT
- `created_at` TIMESTAMP

#### users
- `id` UUID (PK, FK to auth.users)
- `family_id` UUID (FK to families)
- `name` TEXT
- `email` TEXT
- `role` TEXT (parent/child)
- `locale` TEXT (en/zh-CN)
- `created_at` TIMESTAMP

#### quests
- `id` UUID (PK)
- `family_id` UUID (FK to families)
- `title_en` TEXT
- `title_zh` TEXT
- `description_en` TEXT
- `description_zh` TEXT
- `type` TEXT (duty/bonus/violation)
- `scope` TEXT (self/family/other)
- `category` TEXT
- `stars` INTEGER
- `max_per_day` INTEGER
- `is_template` BOOLEAN

#### rewards
- `id` UUID (PK)
- `family_id` UUID (FK to families)
- `title_en` TEXT
- `title_zh` TEXT
- `description_en` TEXT
- `description_zh` TEXT
- `category` TEXT
- `cost` INTEGER
- `is_available` BOOLEAN

#### star_transactions
- `id` UUID (PK)
- `user_id` UUID (FK to users)
- `stars` INTEGER (positive or negative)
- `description` TEXT
- `created_at` TIMESTAMP
- `recorded_by` UUID (FK to users)
- `quest_id` UUID (FK to quests)
- `request_id` UUID (FK to star_requests)

#### star_requests
- `id` UUID (PK)
- `user_id` UUID (FK to users)
- `quest_id` UUID (FK to quests)
- `note` TEXT
- `status` TEXT (pending/approved/rejected)
- `reviewed_by` UUID (FK to users)
- `reviewed_at` TIMESTAMP
- `review_note` TEXT

#### redemption_requests
- `id` UUID (PK)
- `user_id` UUID (FK to users)
- `reward_id` UUID (FK to rewards)
- `status` TEXT (pending/approved/rejected/fulfilled)
- `reviewed_by` UUID (FK to users)
- `reviewed_at` TIMESTAMP
- `review_note` TEXT

#### levels
- `id` UUID (PK)
- `family_id` UUID (FK to families)
- `level_number` INTEGER
- `name_en` TEXT
- `name_zh` TEXT
- `stars_required` INTEGER
- `badge` TEXT

---

## 🔌 API Reference

### Database Functions

#### create_family_with_templates
Creates new family with default templates.

**Parameters:**
- `p_family_name` TEXT
- `p_user_id` UUID
- `p_user_name` TEXT
- `p_user_email` TEXT
- `p_user_locale` TEXT

**Returns:** UUID (family_id)

**Example:**
```typescript
const { data: familyId, error } = await supabase.rpc('create_family_with_templates', {
  p_family_name: 'Smith Family',
  p_user_id: userId,
  p_user_name: 'John Smith',
  p_user_email: 'john@example.com',
  p_user_locale: 'en'
});
```

#### initialize_family_templates
Seeds family with default quests, rewards, and levels.

**Parameters:**
- `p_family_id` UUID

**Returns:** VOID

---

## 🌍 Internationalization

### Supported Locales

- **English (en):** Default language
- **Chinese Simplified (zh-CN):** Full translation

### Locale Features

1. **URL-based Routing**
   - `/en/...` for English
   - `/zh-CN/...` for Chinese

2. **Database Content**
   - Dual-language fields for quests and rewards
   - `title_en` / `title_zh`
   - `description_en` / `description_zh`

3. **UI Translations**
   - Complete interface translation
   - Form labels and buttons
   - Error messages
   - Success notifications

4. **User Preferences**
   - Locale stored in user record
   - Persists across sessions
   - Language switcher in header

---

## 📊 Key Metrics & Analytics

### Family Metrics
- Total stars earned (all time)
- Total stars redeemed
- Active children count
- Quest completion rate

### Child Metrics
- Current star balance
- Total stars earned
- Total stars spent
- Current level
- Quest completion rate by type
- Average stars per day
- Favorite quest categories

### Parent Insights
- Most effective quests
- Most requested rewards
- Peak activity times
- Approval response time

---

## 🔐 Security & Privacy

### Authentication
- Email/password with confirmation
- Session-based authentication
- Automatic token refresh
- Secure password requirements (6+ characters)

### Authorization
- Role-based access control (RBAC)
- Row Level Security (RLS) policies
- Family-scoped data isolation
- Parent-only admin features

### Data Privacy
- Each family's data is isolated
- Children can only see their own data
- No cross-family data access
- GDPR-compliant data handling

---

## 📞 Support & Resources

### Documentation
- Product Documentation (this file)
- Technical Documentation
- API Reference
- Database Schema Guide

### Community
- GitHub Repository
- Issue Tracker
- Feature Requests
- Discussions

---

**© 2025 StarQuest. Built with Next.js & Supabase.**
