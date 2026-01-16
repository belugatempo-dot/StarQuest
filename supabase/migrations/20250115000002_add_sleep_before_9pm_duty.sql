-- Add "Sleep before 9:00 PM" duty quest
-- Migration: Add bedtime duty quest to all families

-- Insert "Sleep before 9:00 PM" duty quest for all families
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
  'Sleep before 9:00 PM' as name_en,
  '晚上9:00前睡觉' as name_zh,
  -5 as stars,
  'duty' as type,
  'self' as scope,
  'health' as category,
  '😴' as icon,
  true as is_active,
  10 as max_per_day,
  103 as sort_order
FROM families
WHERE NOT EXISTS (
  SELECT 1 FROM quests
  WHERE quests.family_id = families.id
  AND quests.name_en = 'Sleep before 9:00 PM'
);
