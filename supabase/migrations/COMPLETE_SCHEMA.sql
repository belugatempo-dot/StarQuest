-- =============================================
-- StarQuest Complete Schema (with PRD Updates)
-- =============================================
-- This file contains the complete database schema including
-- the latest PRD updates (type, scope, max_per_day fields)
--
-- Usage: Run this file in a fresh Supabase project
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (both parents and children)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  family_id UUID REFERENCES families(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  email TEXT UNIQUE,
  avatar_url TEXT,
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'zh-CN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quests table (with new type, scope, max_per_day fields)
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  stars INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'bonus' CHECK (type IN ('duty', 'bonus', 'violation')),
  scope TEXT NOT NULL DEFAULT 'self' CHECK (scope IN ('self', 'family', 'other')),
  category TEXT CHECK (category IN ('chores', 'hygiene', 'learning', 'health', 'social', 'other')),
  icon TEXT,
  is_positive BOOLEAN GENERATED ALWAYS AS (stars > 0) STORED,
  is_active BOOLEAN DEFAULT true,
  max_per_day INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Star transactions table
CREATE TABLE star_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  child_id UUID REFERENCES users(id) NOT NULL,
  quest_id UUID REFERENCES quests(id),
  custom_description TEXT,
  stars INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('parent_record', 'child_request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  child_note TEXT,
  parent_response TEXT,
  created_by UUID REFERENCES users(id) NOT NULL,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Rewards table
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
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

-- Redemptions table
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  child_id UUID REFERENCES users(id) NOT NULL,
  reward_id UUID REFERENCES rewards(id) NOT NULL,
  stars_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  child_note TEXT,
  parent_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE
);

-- Levels table
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  level_number INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  stars_required INTEGER NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, level_number)
);

-- =============================================
-- VIEWS
-- =============================================

-- Child balances view (computed from transactions and redemptions)
CREATE VIEW child_balances AS
WITH base_balance AS (
  SELECT
    u.id AS child_id,
    u.family_id,
    u.name,
    COALESCE(SUM(st.stars) FILTER (WHERE st.status = 'approved'), 0)
      - COALESCE(
          (SELECT SUM(r.stars_spent)
           FROM redemptions r
           WHERE r.child_id = u.id AND r.status IN ('approved', 'fulfilled')),
          0
        ) AS current_stars,
    COALESCE(SUM(st.stars) FILTER (WHERE st.status = 'approved' AND st.stars > 0), 0) AS lifetime_stars
  FROM users u
  LEFT JOIN star_transactions st ON st.child_id = u.id
  WHERE u.role = 'child'
  GROUP BY u.id, u.family_id, u.name
)
SELECT
  bb.child_id,
  bb.family_id,
  bb.name,
  bb.current_stars,
  bb.lifetime_stars,
  COALESCE(ccs.credit_enabled, false) AS credit_enabled,
  COALESCE(ccs.credit_limit, 0) AS credit_limit,
  COALESCE(ccs.original_credit_limit, 0) AS original_credit_limit,
  CASE WHEN bb.current_stars < 0 THEN ABS(bb.current_stars) ELSE 0 END AS credit_used,
  CASE
    WHEN COALESCE(ccs.credit_enabled, false) = true
    THEN GREATEST(COALESCE(ccs.credit_limit, 0) - CASE WHEN bb.current_stars < 0 THEN ABS(bb.current_stars) ELSE 0 END, 0)
    ELSE 0
  END AS available_credit,
  CASE
    WHEN COALESCE(ccs.credit_enabled, false) = true
    THEN GREATEST(bb.current_stars, 0) + GREATEST(COALESCE(ccs.credit_limit, 0) - CASE WHEN bb.current_stars < 0 THEN ABS(bb.current_stars) ELSE 0 END, 0)
    ELSE GREATEST(bb.current_stars, 0)
  END AS spendable_stars
FROM base_balance bb
LEFT JOIN child_credit_settings ccs ON ccs.child_id = bb.child_id;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_quests_family_id ON quests(family_id);
CREATE INDEX idx_quests_type ON quests(type);
CREATE INDEX idx_quests_scope ON quests(scope);
CREATE INDEX idx_quests_is_active ON quests(is_active);
CREATE INDEX idx_star_transactions_family_id ON star_transactions(family_id);
CREATE INDEX idx_star_transactions_child_id ON star_transactions(child_id);
CREATE INDEX idx_star_transactions_status ON star_transactions(status);
CREATE INDEX idx_rewards_family_id ON rewards(family_id);
CREATE INDEX idx_redemptions_family_id ON redemptions(family_id);
CREATE INDEX idx_redemptions_child_id ON redemptions(child_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_levels_family_id ON levels(family_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

-- Families policies
CREATE POLICY "Users can view their own family" ON families
  FOR SELECT USING (
    id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

-- Users policies
CREATE POLICY "Users can view family members" ON users
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Parents can update family members" ON users
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Quests policies
CREATE POLICY "Parents full access to quests" ON quests
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Children can view active quests" ON quests
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    AND is_active = true
  );

-- Star transactions policies
CREATE POLICY "Parents full access to transactions" ON star_transactions
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Children view own transactions" ON star_transactions
  FOR SELECT USING (
    child_id = auth.uid()
  );

CREATE POLICY "Children create own requests" ON star_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'child')
    AND child_id = auth.uid()
    AND source = 'child_request'
    AND status = 'pending'
    AND stars > 0
  );

-- Rewards policies
CREATE POLICY "Parents full access to rewards" ON rewards
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Children can view active rewards" ON rewards
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    AND is_active = true
  );

-- Redemptions policies
CREATE POLICY "Parents full access to redemptions" ON redemptions
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Children view own redemptions" ON redemptions
  FOR SELECT USING (
    child_id = auth.uid()
  );

CREATE POLICY "Children create own redemptions" ON redemptions
  FOR INSERT WITH CHECK (
    child_id = auth.uid()
    AND status = 'pending'
  );

-- Levels policies
CREATE POLICY "Users can view family levels" ON levels
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Parents can manage levels" ON levels
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- =============================================
-- SEED TEMPLATE FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION initialize_family_templates(p_family_id UUID)
RETURNS void AS $$
BEGIN
  -- ==========================================
  -- My Duties - Hygiene (日常本分 - 卫生类)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Brush teeth', '刷牙', -5, 'duty', 'self', 'hygiene', '🪥', 2, 1),
    (p_family_id, 'Take a shower', '洗澡', -5, 'duty', 'self', 'hygiene', '🚿', 1, 2),
    (p_family_id, 'Wash own clothes', '洗自己的衣服', -10, 'duty', 'self', 'hygiene', '👕', 1, 3),
    (p_family_id, 'Clean sports gear', '洗运动装备/泳具', -5, 'duty', 'self', 'hygiene', '🏊', 1, 4);

  -- ==========================================
  -- My Duties - Chores (日常本分 - 家务类)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Take out trash', '扔垃圾', -5, 'duty', 'self', 'chores', '🗑️', 1, 5),
    (p_family_id, 'Clean own room', '整理房间', -10, 'duty', 'self', 'chores', '🛏️', 1, 6),
    (p_family_id, 'Organize backpack', '整理书包', -5, 'duty', 'self', 'chores', '🎒', 1, 7),
    (p_family_id, 'Clear own dishes', '收拾自己的碗筷', -5, 'duty', 'self', 'chores', '🍽️', 3, 8);

  -- ==========================================
  -- My Duties - Learning (日常本分 - 学习类)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Finish homework', '完成作业', -15, 'duty', 'self', 'learning', '📝', 1, 9),
    (p_family_id, 'Prepare for school', '准备上学物品', -5, 'duty', 'self', 'learning', '🏫', 1, 10),
    (p_family_id, 'Practice instrument', '练习乐器', -10, 'duty', 'self', 'learning', '🎹', 1, 11);

  -- ==========================================
  -- Helping Family (帮助家人)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Help wash dishes', '帮忙洗碗', 15, 'bonus', 'family', 'chores', '🍳', 2, 12),
    (p_family_id, 'Help cook', '帮忙做饭', 15, 'bonus', 'family', 'chores', '👨‍🍳', 2, 13),
    (p_family_id, 'Help clean common areas', '帮忙打扫公共区域', 15, 'bonus', 'family', 'chores', '🧹', 1, 14),
    (p_family_id, 'Help with groceries', '帮忙买东西/搬东西', 10, 'bonus', 'family', 'chores', '🛒', 1, 15),
    (p_family_id, 'Help care for pets', '帮忙照顾宠物', 10, 'bonus', 'family', 'chores', '🐕', 2, 16),
    (p_family_id, 'Help wash car', '帮忙洗车', 20, 'bonus', 'family', 'chores', '🚗', 1, 17),
    (p_family_id, 'Help with laundry', '帮忙洗/晾衣服', 10, 'bonus', 'family', 'chores', '🧺', 1, 18);

  -- ==========================================
  -- Self Bonus (自我提升)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Extra reading 30 min', '额外阅读30分钟', 15, 'bonus', 'self', 'learning', '📖', 2, 19),
    (p_family_id, 'Extra exercise 30 min', '额外运动30分钟', 10, 'bonus', 'self', 'health', '🏃', 2, 20),
    (p_family_id, 'Learn something new', '学会新东西', 30, 'bonus', 'self', 'learning', '💡', 1, 21),
    (p_family_id, 'Finish homework early', '提前完成作业', 10, 'bonus', 'self', 'learning', '⏰', 1, 22),
    (p_family_id, 'Practice beyond requirement', '额外练习', 15, 'bonus', 'self', 'learning', '🎯', 1, 23),
    (p_family_id, 'Neat handwriting', '整洁书写', 10, 'bonus', 'self', 'learning', '✍️', 3, 24),
    (p_family_id, 'Show great patience', '表现出很好的耐心', 10, 'bonus', 'self', 'social', '🧘', 2, 25),
    (p_family_id, 'Proactively set up plan and timetable', '主动制定计划和时间表', 25, 'bonus', 'self', 'responsibility', '📅', 2, 26),
    (p_family_id, 'Break own swimming record', '游泳打破自己的记录', 30, 'bonus', 'self', 'exercise', '🏊', 3, 27);

  -- ==========================================
  -- Helping Others (帮助他人)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Help classmates', '帮助同学', 20, 'bonus', 'other', 'social', '👫', 3, 28),
    (p_family_id, 'Help neighbors', '帮助邻居', 20, 'bonus', 'other', 'social', '🏘️', 2, 29),
    (p_family_id, 'Share with others', '和他人分享', 10, 'bonus', 'other', 'social', '🤝', 3, 30),
    (p_family_id, 'Comfort someone', '安慰他人', 15, 'bonus', 'other', 'social', '💝', 2, 31),
    (p_family_id, 'Teach others', '教别人东西', 20, 'bonus', 'other', 'social', '👨‍🏫', 2, 32),
    (p_family_id, 'Parent yelled at me', '家长对我大喊大叫', 20, 'bonus', 'other', 'social', '🗣️', 3, 33),
    (p_family_id, 'Observe and learn from others in competition', '比赛时认真观察学习他人优缺点', 20, 'bonus', 'other', 'learning', '👀', 3, 34);

  -- ==========================================
  -- Violations (违规行为)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Lying', '说谎', -30, 'violation', 'self', 'social', '🤥', 99, 35),
    (p_family_id, 'Hitting / Physical aggression', '打人', -50, 'violation', 'self', 'social', '👊', 99, 36),
    (p_family_id, 'Disrespecting elders', '不尊重长辈', -20, 'violation', 'self', 'social', '😤', 99, 37),
    (p_family_id, 'Throwing tantrum', '发脾气大闹', -15, 'violation', 'self', 'social', '😡', 99, 38),
    (p_family_id, 'Breaking promise', '违背承诺', -20, 'violation', 'self', 'social', '💔', 99, 39),
    (p_family_id, 'Using bad words', '说脏话', -10, 'violation', 'self', 'social', '🤬', 99, 40),
    (p_family_id, 'Yelling / Shouting', '大喊大叫', -10, 'violation', 'self', 'social', '📢', 99, 41),
    (p_family_id, 'Not following rules', '不遵守规则', -15, 'violation', 'self', 'other', '⛔', 99, 42),
    (p_family_id, 'Missing defined timetable', '没有按时间表执行', -15, 'violation', 'self', 'responsibility', '⏰', 99, 43),
    (p_family_id, 'Spanking / Hitting buttocks', '打人屁股', -40, 'violation', 'self', 'social', '🍑', 99, 44),
    (p_family_id, 'Inappropriate teasing / Harassment', '撩人/不当骚扰', -25, 'violation', 'self', 'social', '😏', 99, 45);

  -- ==========================================
  -- Updated Rewards (according to new pricing)
  -- ==========================================
  INSERT INTO rewards (family_id, name_en, name_zh, stars_cost, category, icon, sort_order) VALUES
    (p_family_id, '15 min screen time', '15分钟屏幕时间', 30, 'screen_time', '📱', 1),
    (p_family_id, '30 min gaming', '30分钟游戏', 50, 'screen_time', '🎮', 2),
    (p_family_id, '1 hour gaming', '1小时游戏', 90, 'screen_time', '🕹️', 3),
    (p_family_id, '1 episode of show', '看一集动画', 30, 'screen_time', '📺', 4),
    (p_family_id, 'Choose dinner menu', '选择晚餐', 40, 'activities', '🍽️', 5),
    (p_family_id, 'Stay up 30 min late', '晚睡30分钟', 50, 'activities', '🌙', 6),
    (p_family_id, 'Small treat', '小零食', 30, 'treats', '🍪', 7),
    (p_family_id, 'Small toy ($10)', '小玩具', 200, 'toys', '🧸', 8),
    (p_family_id, 'Medium toy ($30)', '中等玩具', 400, 'toys', '🎁', 9),
    (p_family_id, 'Play date with friends', '和朋友玩', 150, 'activities', '👫', 10),
    (p_family_id, 'Big reward ($50+)', '大奖励', 600, 'toys', '🏆', 11);

  -- ==========================================
  -- Levels (unchanged)
  -- ==========================================
  INSERT INTO levels (family_id, level_number, name_en, name_zh, stars_required, icon) VALUES
    (p_family_id, 1, 'Starter', '新手', 0, '🌱'),
    (p_family_id, 2, 'Explorer', '探索者', 50, '🔍'),
    (p_family_id, 3, 'Adventurer', '冒险家', 150, '🎒'),
    (p_family_id, 4, 'Champion', '勇士', 300, '⚔️'),
    (p_family_id, 5, 'Hero', '英雄', 500, '🦸'),
    (p_family_id, 6, 'Legend', '传奇', 1000, '👑'),
    (p_family_id, 7, 'Star Master', '星星大师', 2000, '⭐');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Create Family with Templates Function
-- =============================================

CREATE OR REPLACE FUNCTION create_family_with_templates(
  p_family_name TEXT,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_email TEXT,
  p_user_locale TEXT DEFAULT 'en'
)
RETURNS UUID AS $$
DECLARE
  v_family_id UUID;
  v_existing_family_id UUID;
BEGIN
  -- Check if user already exists and has a family
  SELECT family_id INTO v_existing_family_id
  FROM users
  WHERE id = p_user_id;

  -- If user already has a family, return it
  IF v_existing_family_id IS NOT NULL THEN
    RETURN v_existing_family_id;
  END IF;

  -- Check if user exists but has no family (edge case)
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    -- User exists, just create family and update user
    INSERT INTO families (name) VALUES (p_family_name)
    RETURNING id INTO v_family_id;

    UPDATE users
    SET family_id = v_family_id,
        name = p_user_name,
        email = p_user_email,
        role = 'parent',
        locale = p_user_locale
    WHERE id = p_user_id;
  ELSE
    -- New user, create everything
    INSERT INTO families (name) VALUES (p_family_name)
    RETURNING id INTO v_family_id;

    INSERT INTO users (id, family_id, name, email, role, locale)
    VALUES (p_user_id, v_family_id, p_user_name, p_user_email, 'parent', p_user_locale);
  END IF;

  -- Initialize templates
  PERFORM initialize_family_templates(v_family_id);

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION initialize_family_templates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE quests IS 'Quest/task templates with new type/scope classification system';
COMMENT ON COLUMN quests.type IS 'Quest type: duty (should do, miss = deduct), bonus (extra effort = earn), violation (bad behavior = deduct)';
COMMENT ON COLUMN quests.scope IS 'Quest scope: self (for oneself), family (help family), other (help others outside family)';
COMMENT ON COLUMN quests.max_per_day IS 'Maximum number of times this quest can be recorded per day';
COMMENT ON COLUMN quests.is_positive IS 'Generated column: true if stars > 0, kept for backward compatibility';

-- =============================================
-- END OF SCHEMA
-- =============================================
