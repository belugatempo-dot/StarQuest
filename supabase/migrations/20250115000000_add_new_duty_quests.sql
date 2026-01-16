-- Add two new duty quests to all families
-- Migration: Add "Write Down Assignments" and "Practice handwriting" duty quests

-- Insert "Write Down Assignments" duty quest for all families
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
  'Write Down Assignments' as name_en,
  '记录作业' as name_zh,
  -3 as stars,
  'duty' as type,
  'self' as scope,
  'learning' as category,
  '📝' as icon,
  true as is_active,
  1 as max_per_day,
  100 as sort_order
FROM families
WHERE NOT EXISTS (
  SELECT 1 FROM quests
  WHERE quests.family_id = families.id
  AND quests.name_en = 'Write Down Assignments'
);

-- Insert "Practice handwriting" duty quest for all families
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
  'Practice handwriting' as name_en,
  '练习书法' as name_zh,
  -3 as stars,
  'duty' as type,
  'self' as scope,
  'learning' as category,
  '✍️' as icon,
  true as is_active,
  1 as max_per_day,
  101 as sort_order
FROM families
WHERE NOT EXISTS (
  SELECT 1 FROM quests
  WHERE quests.family_id = families.id
  AND quests.name_en = 'Practice handwriting'
);
