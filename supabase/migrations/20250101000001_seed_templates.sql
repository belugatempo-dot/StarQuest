-- StarQuest Seed Data
-- This migration creates template quests, rewards, and levels
-- These will be inserted when a new family is created

-- Note: These are template functions that can be called when creating a new family
-- The actual insertion happens in the application code during family registration

-- =============================================
-- FUNCTION: Initialize Family Templates
-- =============================================

CREATE OR REPLACE FUNCTION initialize_family_templates(p_family_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert default quests (positive behaviors)
  INSERT INTO quests (family_id, name_en, name_zh, stars, category, icon, sort_order) VALUES
    (p_family_id, 'Finish homework on time', '按时完成作业', 10, 'learning', '📚', 1),
    (p_family_id, 'Read for 30 minutes', '阅读30分钟', 5, 'learning', '📖', 2),
    (p_family_id, 'Help with chores', '帮忙做家务', 5, 'chores', '🧹', 3),
    (p_family_id, 'Be polite and respectful', '礼貌待人', 3, 'manners', '🙏', 4),
    (p_family_id, 'Brush teeth without reminder', '主动刷牙', 2, 'health', '🪥', 5),
    (p_family_id, 'Exercise for 30 minutes', '运动30分钟', 5, 'health', '⚽', 6);

  -- Insert default quests (negative behaviors)
  INSERT INTO quests (family_id, name_en, name_zh, stars, category, icon, sort_order) VALUES
    (p_family_id, 'Hitting or fighting', '打人', -15, 'manners', '🚫', 7),
    (p_family_id, 'Lying', '说谎', -10, 'manners', '🤥', 8),
    (p_family_id, 'Not following rules', '不遵守规则', -5, 'other', '⚠️', 9);

  -- Insert default rewards
  INSERT INTO rewards (family_id, name_en, name_zh, stars_cost, category, icon, sort_order) VALUES
    (p_family_id, '30 min screen time', '30分钟屏幕时间', 30, 'screen_time', '📱', 1),
    (p_family_id, '1 hour gaming', '1小时游戏', 50, 'screen_time', '🎮', 2),
    (p_family_id, 'Choose dinner menu', '选择晚餐菜单', 20, 'activities', '🍽️', 3),
    (p_family_id, 'Small toy', '小玩具', 100, 'toys', '🧸', 4),
    (p_family_id, 'Play date with friends', '和朋友玩耍日', 80, 'activities', '🎉', 5),
    (p_family_id, 'Stay up 30 min late', '晚睡30分钟', 40, 'treats', '🌙', 6);

  -- Insert default levels
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
-- FUNCTION: Create New Family with Templates
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
