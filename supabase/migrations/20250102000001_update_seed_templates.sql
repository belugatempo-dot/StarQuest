-- StarQuest Seed Data - Updated with new quest type/scope system
-- This migration replaces the old template system with the new classification system

-- Drop old functions first
DROP FUNCTION IF EXISTS initialize_family_templates(UUID);
DROP FUNCTION IF EXISTS create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT);

-- =============================================
-- FUNCTION: Initialize Family Templates (Updated)
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
    (p_family_id, 'Show great patience', '表现出很好的耐心', 10, 'bonus', 'self', 'social', '🧘', 2, 24);

  -- ==========================================
  -- Helping Others (帮助他人)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Help classmates', '帮助同学', 20, 'bonus', 'other', 'social', '👫', 3, 25),
    (p_family_id, 'Help neighbors', '帮助邻居', 20, 'bonus', 'other', 'social', '🏘️', 2, 26),
    (p_family_id, 'Share with others', '和他人分享', 10, 'bonus', 'other', 'social', '🤝', 3, 27),
    (p_family_id, 'Comfort someone', '安慰他人', 15, 'bonus', 'other', 'social', '💝', 2, 28),
    (p_family_id, 'Teach others', '教别人东西', 20, 'bonus', 'other', 'social', '👨‍🏫', 2, 29);

  -- ==========================================
  -- Violations (违规行为)
  -- ==========================================
  INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order) VALUES
    (p_family_id, 'Lying', '说谎', -30, 'violation', 'self', 'social', '🤥', 99, 30),
    (p_family_id, 'Hitting / Physical aggression', '打人', -50, 'violation', 'self', 'social', '👊', 99, 31),
    (p_family_id, 'Disrespecting elders', '不尊重长辈', -20, 'violation', 'self', 'social', '😤', 99, 32),
    (p_family_id, 'Throwing tantrum', '发脾气大闹', -15, 'violation', 'self', 'social', '😡', 99, 33),
    (p_family_id, 'Breaking promise', '违背承诺', -20, 'violation', 'self', 'social', '💔', 99, 34),
    (p_family_id, 'Using bad words', '说脏话', -10, 'violation', 'self', 'social', '🤬', 99, 35),
    (p_family_id, 'Not following rules', '不遵守规则', -15, 'violation', 'self', 'other', '⛔', 99, 36);

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
-- FUNCTION: Create New Family with Templates (Unchanged)
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
BEGIN
  -- Create the family
  INSERT INTO families (name) VALUES (p_family_name)
  RETURNING id INTO v_family_id;

  -- Create the parent user
  INSERT INTO users (id, family_id, name, email, role, locale)
  VALUES (p_user_id, v_family_id, p_user_name, p_user_email, 'parent', p_user_locale);

  -- Initialize templates
  PERFORM initialize_family_templates(v_family_id);

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION initialize_family_templates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_family_with_templates(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
