-- StarQuest Database Schema
-- This migration creates all the tables, views, and RLS policies for the StarQuest application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: families
-- =============================================
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLE: users
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  email TEXT,
  avatar_url TEXT,
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'zh-CN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLE: quests
-- =============================================
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  stars INTEGER NOT NULL,
  category TEXT CHECK (category IN ('learning', 'chores', 'manners', 'health', 'other')),
  icon TEXT,
  is_positive BOOLEAN GENERATED ALWAYS AS (stars > 0) STORED,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLE: star_transactions
-- =============================================
CREATE TABLE star_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  custom_description TEXT,
  stars INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('parent_record', 'child_request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  child_note TEXT,
  parent_response TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- TABLE: rewards
-- =============================================
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  stars_cost INTEGER NOT NULL,
  category TEXT CHECK (category IN ('screen_time', 'toys', 'activities', 'treats', 'other')),
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLE: redemptions
-- =============================================
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE NOT NULL,
  stars_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  child_note TEXT,
  parent_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- TABLE: levels
-- =============================================
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  level_number INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  stars_required INTEGER NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, level_number)
);

-- =============================================
-- VIEW: child_balances
-- =============================================
CREATE OR REPLACE VIEW child_balances AS
SELECT
  u.id AS child_id,
  u.family_id,
  u.name,
  -- Current available stars = earned - redeemed
  COALESCE(SUM(st.stars) FILTER (WHERE st.status = 'approved'), 0)
    - COALESCE(
        (SELECT SUM(r.stars_spent)
         FROM redemptions r
         WHERE r.child_id = u.id AND r.status IN ('approved', 'fulfilled')),
        0
      ) AS current_stars,
  -- Lifetime stars (used for level calculation)
  COALESCE(SUM(st.stars) FILTER (WHERE st.status = 'approved' AND st.stars > 0), 0) AS lifetime_stars
FROM users u
LEFT JOIN star_transactions st ON st.child_id = u.id
WHERE u.role = 'child'
GROUP BY u.id, u.family_id, u.name;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FAMILIES POLICIES
-- =============================================

-- Users can read their own family
CREATE POLICY "Users can read own family" ON families
  FOR SELECT USING (
    id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- Parents can update their own family
CREATE POLICY "Parents can update own family" ON families
  FOR UPDATE USING (
    id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Anyone can create a family (for registration)
CREATE POLICY "Anyone can create family" ON families
  FOR INSERT WITH CHECK (true);

-- =============================================
-- USERS POLICIES
-- =============================================

-- Users can read their own family members
CREATE POLICY "Users can read own family members" ON users
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- Users can read their own record
CREATE POLICY "Users can read own record" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can update their own record
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (id = auth.uid());

-- Parents can manage family members
CREATE POLICY "Parents can manage family members" ON users
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Anyone can insert (for registration)
CREATE POLICY "Anyone can insert user" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- =============================================
-- QUESTS POLICIES
-- =============================================

-- Users can read their family's quests
CREATE POLICY "Users can read family quests" ON quests
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- Parents have full access to quests
CREATE POLICY "Parents full access to quests" ON quests
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- =============================================
-- STAR_TRANSACTIONS POLICIES
-- =============================================

-- Users can read their family's transactions
CREATE POLICY "Users can read family transactions" ON star_transactions
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- Parents have full access to transactions
CREATE POLICY "Parents full access to transactions" ON star_transactions
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Children can create their own star requests (positive only)
CREATE POLICY "Children create own requests" ON star_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'child')
    AND child_id = auth.uid()
    AND source = 'child_request'
    AND status = 'pending'
    AND stars > 0
  );

-- =============================================
-- REWARDS POLICIES
-- =============================================

-- Users can read their family's rewards
CREATE POLICY "Users can read family rewards" ON rewards
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- Parents have full access to rewards
CREATE POLICY "Parents full access to rewards" ON rewards
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- =============================================
-- REDEMPTIONS POLICIES
-- =============================================

-- Users can read their family's redemptions
CREATE POLICY "Users can read family redemptions" ON redemptions
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- Parents have full access to redemptions
CREATE POLICY "Parents full access to redemptions" ON redemptions
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Children can create their own redemption requests
CREATE POLICY "Children create own redemptions" ON redemptions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'child')
    AND child_id = auth.uid()
    AND status = 'pending'
  );

-- =============================================
-- LEVELS POLICIES
-- =============================================

-- Users can read their family's levels
CREATE POLICY "Users can read family levels" ON levels
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- Parents have full access to levels
CREATE POLICY "Parents full access to levels" ON levels
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- =============================================
-- INDEXES for better performance
-- =============================================

CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_quests_family_id ON quests(family_id);
CREATE INDEX idx_quests_is_active ON quests(is_active);
CREATE INDEX idx_star_transactions_family_id ON star_transactions(family_id);
CREATE INDEX idx_star_transactions_child_id ON star_transactions(child_id);
CREATE INDEX idx_star_transactions_status ON star_transactions(status);
CREATE INDEX idx_rewards_family_id ON rewards(family_id);
CREATE INDEX idx_rewards_is_active ON rewards(is_active);
CREATE INDEX idx_redemptions_family_id ON redemptions(family_id);
CREATE INDEX idx_redemptions_child_id ON redemptions(child_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_levels_family_id ON levels(family_id);
