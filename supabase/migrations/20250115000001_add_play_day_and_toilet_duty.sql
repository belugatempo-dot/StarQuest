-- Add "Play Day" reward and "Flush toilet & keep seat clean" duty quest
-- Migration: Add new reward and duty quest to all families

-- Insert "Play Day" reward for all families
INSERT INTO rewards (
  family_id,
  name_en,
  name_zh,
  stars_cost,
  category,
  icon,
  is_active,
  sort_order
)
SELECT
  id as family_id,
  'Play Day' as name_en,
  '游玩日' as name_zh,
  50 as stars_cost,
  'activities' as category,
  '🎮' as icon,
  true as is_active,
  100 as sort_order
FROM families
WHERE NOT EXISTS (
  SELECT 1 FROM rewards
  WHERE rewards.family_id = families.id
  AND rewards.name_en = 'Play Day'
);

-- Insert "Flush toilet & keep seat clean" duty quest for all families
INSERT INTO quests (
  family_id,
  name_en,
  name_zh,
  stars,
  type,
  scope,
  category,
  icon,
  is_active,
  max_per_day,
  sort_order
)
SELECT
  id as family_id,
  'Flush toilet & keep seat clean' as name_en,
  '自己冲厕所，保持马桶圈clean' as name_zh,
  -5 as stars,
  'duty' as type,
  'self' as scope,
  'hygiene' as category,
  '🚽' as icon,
  true as is_active,
  3 as max_per_day,
  102 as sort_order
FROM families
WHERE NOT EXISTS (
  SELECT 1 FROM quests
  WHERE quests.family_id = families.id
  AND quests.name_en = 'Flush toilet & keep seat clean'
);
