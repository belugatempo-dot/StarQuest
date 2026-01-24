-- Migration: Configurable Quest Categories
-- Purpose: Fix category constraint bug and make categories user-configurable
--
-- Problem: Initial schema created an INLINE check constraint that wasn't properly named,
-- so the migration 20260116000001 couldn't drop it (tried to drop 'quests_category_check'
-- but the actual constraint has an auto-generated name like 'quests_category_check1').
--
-- Solution: Drop ALL check constraints on the category column dynamically, then create
-- a quest_categories table for family-specific category management.

-- =============================================
-- STEP 1: Remove ALL existing check constraints on category column
-- =============================================
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find all check constraints on the category column of quests table
    FOR constraint_record IN
        SELECT con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'quests'
          AND att.attname = 'category'
          AND con.contype = 'c'
    LOOP
        RAISE NOTICE 'Dropping constraint: %', constraint_record.constraint_name;
        EXECUTE 'ALTER TABLE quests DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.constraint_name);
    END LOOP;
END $$;

-- Also try dropping the named constraint if it exists (from previous migration attempt)
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_category_check;

-- =============================================
-- STEP 2: Create quest_categories table
-- =============================================
CREATE TABLE IF NOT EXISTS quest_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,           -- internal key (lowercase, no spaces)
    name_en TEXT NOT NULL,        -- English display name
    name_zh TEXT,                 -- Chinese display name (optional)
    icon TEXT DEFAULT '📦',       -- Emoji icon
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, name)       -- Each family can have unique category names
);

-- =============================================
-- STEP 3: Enable RLS on quest_categories
-- =============================================
ALTER TABLE quest_categories ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 4: RLS policies for quest_categories
-- =============================================

-- Policy: Users can view their own family's categories
CREATE POLICY "Users can view own family categories"
    ON quest_categories FOR SELECT
    USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- Policy: Parents can insert new categories
CREATE POLICY "Parents can insert categories"
    ON quest_categories FOR INSERT
    WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'));

-- Policy: Parents can update categories
CREATE POLICY "Parents can update categories"
    ON quest_categories FOR UPDATE
    USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'));

-- Policy: Parents can delete categories
CREATE POLICY "Parents can delete categories"
    ON quest_categories FOR DELETE
    USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'));

-- =============================================
-- STEP 5: Seed default categories for ALL existing families
-- =============================================
INSERT INTO quest_categories (family_id, name, name_en, name_zh, icon, sort_order)
SELECT f.id, cat.name, cat.name_en, cat.name_zh, cat.icon, cat.sort_order
FROM families f
CROSS JOIN (VALUES
    ('health', 'Health', '健康', '💪', 1),
    ('study', 'Study', '学业', '✍️', 2),
    ('chores', 'Chores', '家务', '🧹', 3),
    ('hygiene', 'Hygiene', '卫生', '🧼', 4),
    ('learning', 'Learning', '学习', '📚', 5),
    ('social', 'Social', '社交', '🤝', 6),
    ('creativity', 'Creativity', '创造力', '🎨', 7),
    ('exercise', 'Exercise', '运动', '🏃', 8),
    ('reading', 'Reading', '阅读', '📖', 9),
    ('music', 'Music', '音乐', '🎵', 10),
    ('art', 'Art', '艺术', '🖼️', 11),
    ('kindness', 'Kindness', '善良', '❤️', 12),
    ('responsibility', 'Responsibility', '责任', '🎯', 13),
    ('other', 'Other', '其他', '📦', 99)
) AS cat(name, name_en, name_zh, icon, sort_order)
ON CONFLICT (family_id, name) DO NOTHING;

-- =============================================
-- STEP 6: Update create_family_with_templates function
-- to seed categories for new families
-- =============================================
CREATE OR REPLACE FUNCTION create_family_with_templates(
    p_family_name TEXT,
    p_user_id UUID,
    p_user_name TEXT,
    p_user_email TEXT
) RETURNS UUID AS $$
DECLARE
    v_family_id UUID;
    v_existing_user UUID;
BEGIN
    -- Check if user already exists in users table
    SELECT id INTO v_existing_user FROM users WHERE id = p_user_id;

    IF v_existing_user IS NOT NULL THEN
        -- User already exists, return their family_id
        SELECT family_id INTO v_family_id FROM users WHERE id = p_user_id;
        RETURN v_family_id;
    END IF;

    -- Create family
    INSERT INTO families (name) VALUES (p_family_name)
    RETURNING id INTO v_family_id;

    -- Create parent user
    INSERT INTO users (id, family_id, name, role, email)
    VALUES (p_user_id, v_family_id, p_user_name, 'parent', p_user_email);

    -- Seed quest categories for this family
    INSERT INTO quest_categories (family_id, name, name_en, name_zh, icon, sort_order)
    VALUES
        (v_family_id, 'health', 'Health', '健康', '💪', 1),
        (v_family_id, 'study', 'Study', '学业', '✍️', 2),
        (v_family_id, 'chores', 'Chores', '家务', '🧹', 3),
        (v_family_id, 'hygiene', 'Hygiene', '卫生', '🧼', 4),
        (v_family_id, 'learning', 'Learning', '学习', '📚', 5),
        (v_family_id, 'social', 'Social', '社交', '🤝', 6),
        (v_family_id, 'creativity', 'Creativity', '创造力', '🎨', 7),
        (v_family_id, 'exercise', 'Exercise', '运动', '🏃', 8),
        (v_family_id, 'reading', 'Reading', '阅读', '📖', 9),
        (v_family_id, 'music', 'Music', '音乐', '🎵', 10),
        (v_family_id, 'art', 'Art', '艺术', '🖼️', 11),
        (v_family_id, 'kindness', 'Kindness', '善良', '❤️', 12),
        (v_family_id, 'responsibility', 'Responsibility', '责任', '🎯', 13),
        (v_family_id, 'other', 'Other', '其他', '📦', 99)
    ON CONFLICT (family_id, name) DO NOTHING;

    -- Seed default quests (keeping existing quest seeding logic)
    -- DUTIES (self-scope): things child should do, deduct if not done
    INSERT INTO quests (family_id, name_en, name_zh, stars, category, icon, type, scope) VALUES
        (v_family_id, 'Brush teeth (morning)', '刷牙（早）', -5, 'hygiene', '🪥', 'duty', 'self'),
        (v_family_id, 'Brush teeth (evening)', '刷牙（晚）', -5, 'hygiene', '🪥', 'duty', 'self'),
        (v_family_id, 'Wash face', '洗脸', -3, 'hygiene', '🧴', 'duty', 'self'),
        (v_family_id, 'Tidy room', '整理房间', -10, 'chores', '🛏️', 'duty', 'self'),
        (v_family_id, 'Do homework', '做作业', -15, 'learning', '📝', 'duty', 'self'),
        (v_family_id, 'Practice instrument', '练习乐器', -10, 'learning', '🎹', 'duty', 'self'),
        (v_family_id, 'Pack school bag', '整理书包', -5, 'chores', '🎒', 'duty', 'self'),
        (v_family_id, 'Wear seatbelt', '系安全带', -10, 'health', '🚗', 'duty', 'self'),
        (v_family_id, 'Good table manners', '餐桌礼仪', -5, 'social', '🍽️', 'duty', 'self'),
        (v_family_id, 'Happy play day at school', '在学校开心度过一天', -20, 'social', '🏫', 'duty', 'self'),
        (v_family_id, 'Use toilet properly', '正确使用厕所', -10, 'hygiene', '🚽', 'duty', 'self'),
        (v_family_id, 'Sleep before 9pm', '9点前睡觉', -15, 'health', '😴', 'duty', 'self')
    ON CONFLICT DO NOTHING;

    -- BONUSES (self-scope): extra effort for self-improvement
    INSERT INTO quests (family_id, name_en, name_zh, stars, category, icon, type, scope) VALUES
        (v_family_id, 'Read for 30 minutes', '阅读30分钟', 15, 'reading', '📚', 'bonus', 'self'),
        (v_family_id, 'Exercise for 30 minutes', '运动30分钟', 15, 'exercise', '🏃', 'bonus', 'self'),
        (v_family_id, 'Learn new skill', '学习新技能', 20, 'learning', '🎯', 'bonus', 'self'),
        (v_family_id, 'Complete extra homework', '完成额外作业', 20, 'learning', '📝', 'bonus', 'self'),
        (v_family_id, 'Practice music extra', '额外练习音乐', 15, 'music', '🎵', 'bonus', 'self'),
        (v_family_id, 'Create art/craft', '创作艺术/手工', 15, 'art', '🎨', 'bonus', 'self'),
        (v_family_id, 'Write neatly', '书写整齐', 10, 'learning', '✍️', 'bonus', 'self'),
        (v_family_id, 'Plan ahead (make plans)', '提前规划（制定计划）', 15, 'responsibility', '📋', 'bonus', 'self'),
        (v_family_id, 'Achieve a goal', '达成目标', 25, 'responsibility', '🏆', 'bonus', 'self')
    ON CONFLICT DO NOTHING;

    -- BONUSES (family-scope): helping family members
    INSERT INTO quests (family_id, name_en, name_zh, stars, category, icon, type, scope) VALUES
        (v_family_id, 'Help with dishes', '帮忙洗碗', 10, 'chores', '🍽️', 'bonus', 'family'),
        (v_family_id, 'Help with cooking', '帮忙做饭', 15, 'chores', '🍳', 'bonus', 'family'),
        (v_family_id, 'Help clean house', '帮忙打扫卫生', 15, 'chores', '🧹', 'bonus', 'family'),
        (v_family_id, 'Care for pet', '照顾宠物', 10, 'kindness', '🐕', 'bonus', 'family'),
        (v_family_id, 'Help sibling', '帮助兄弟姐妹', 15, 'kindness', '👫', 'bonus', 'family'),
        (v_family_id, 'Water plants', '浇花', 10, 'chores', '🌱', 'bonus', 'family'),
        (v_family_id, 'Set the table', '摆餐具', 10, 'chores', '🍴', 'bonus', 'family')
    ON CONFLICT DO NOTHING;

    -- BONUSES (other-scope): helping people outside family
    INSERT INTO quests (family_id, name_en, name_zh, stars, category, icon, type, scope) VALUES
        (v_family_id, 'Help classmate', '帮助同学', 15, 'social', '🤝', 'bonus', 'other'),
        (v_family_id, 'Share with friend', '与朋友分享', 10, 'kindness', '🎁', 'bonus', 'other'),
        (v_family_id, 'Be polite to stranger', '对陌生人有礼貌', 10, 'social', '👋', 'bonus', 'other'),
        (v_family_id, 'Participate in community', '参与社区活动', 20, 'social', '🏘️', 'bonus', 'other'),
        (v_family_id, 'Help elderly', '帮助老人', 20, 'kindness', '👴', 'bonus', 'other')
    ON CONFLICT DO NOTHING;

    -- VIOLATIONS: serious behavior issues
    INSERT INTO quests (family_id, name_en, name_zh, stars, category, icon, type, scope) VALUES
        (v_family_id, 'Lying', '说谎', -30, 'social', '🤥', 'violation', 'self'),
        (v_family_id, 'Hitting', '打人', -40, 'social', '👊', 'violation', 'self'),
        (v_family_id, 'Tantrums', '发脾气', -20, 'social', '😤', 'violation', 'self'),
        (v_family_id, 'Breaking things', '损坏物品', -30, 'responsibility', '💔', 'violation', 'self'),
        (v_family_id, 'Disrespecting adults', '不尊重大人', -25, 'social', '😠', 'violation', 'self'),
        (v_family_id, 'Screen time violation', '违反屏幕时间规定', -20, 'responsibility', '📱', 'violation', 'self'),
        (v_family_id, 'Not following rules', '不遵守规则', -15, 'responsibility', '📋', 'violation', 'self'),
        (v_family_id, 'Spanking sibling', '打兄弟姐妹', -50, 'social', '🚫', 'violation', 'self'),
        (v_family_id, 'Teasing sibling', '取笑兄弟姐妹', -20, 'social', '😜', 'violation', 'self'),
        (v_family_id, 'Yelling at home', '在家大吼大叫', -15, 'social', '🗣️', 'violation', 'self'),
        (v_family_id, 'Yelling at others', '对他人大吼大叫', -25, 'social', '😡', 'violation', 'self')
    ON CONFLICT DO NOTHING;

    -- Seed default rewards
    INSERT INTO rewards (family_id, name_en, name_zh, stars_cost, category, icon) VALUES
        (v_family_id, '30 min screen time', '30分钟屏幕时间', 30, 'screen_time', '📺'),
        (v_family_id, '1 hour screen time', '1小时屏幕时间', 50, 'screen_time', '🎮'),
        (v_family_id, 'Choose dinner', '选择晚餐', 40, 'activities', '🍕'),
        (v_family_id, 'Small toy', '小玩具', 100, 'toys', '🎁'),
        (v_family_id, 'Ice cream', '冰淇淋', 30, 'treats', '🍦'),
        (v_family_id, 'Stay up late (30 min)', '晚睡30分钟', 40, 'activities', '🌙'),
        (v_family_id, 'Movie night pick', '选择电影之夜', 50, 'activities', '🎬'),
        (v_family_id, 'Outing to park', '去公园玩', 60, 'activities', '🏞️'),
        (v_family_id, 'Special snack', '特别零食', 25, 'treats', '🍪'),
        (v_family_id, 'Friend playdate', '和朋友玩', 80, 'activities', '👫'),
        (v_family_id, 'New book', '新书', 70, 'other', '📖')
    ON CONFLICT DO NOTHING;

    -- Seed default levels
    INSERT INTO levels (family_id, level, name_en, name_zh, stars_required, icon, badge) VALUES
        (v_family_id, 1, 'Star Beginner', '星星初学者', 0, '⭐', '🌟'),
        (v_family_id, 2, 'Star Explorer', '星星探索者', 100, '🌟', '✨'),
        (v_family_id, 3, 'Star Achiever', '星星成就者', 300, '💫', '🌠'),
        (v_family_id, 4, 'Star Champion', '星星冠军', 600, '🏆', '👑'),
        (v_family_id, 5, 'Star Master', '星星大师', 1000, '👑', '🎖️'),
        (v_family_id, 6, 'Star Legend', '星星传奇', 1500, '🎖️', '💎'),
        (v_family_id, 7, 'Star Hero', '星星英雄', 2500, '🦸', '🌈')
    ON CONFLICT DO NOTHING;

    RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT) TO authenticated;
