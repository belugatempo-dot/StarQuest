-- Migration: Add yelling-related quests
-- Created: 2026-01-16
-- Description: Adds "大喊大叫" as violation and "家长大喊大叫" as bonus for emotional management

-- Function to add yelling quests to existing families
CREATE OR REPLACE FUNCTION add_yelling_quests()
RETURNS void AS $$
DECLARE
  family_record RECORD;
  max_sort_order INTEGER;
BEGIN
  -- Loop through all families
  FOR family_record IN SELECT id FROM families LOOP
    -- Get the current max sort_order for this family
    SELECT COALESCE(MAX(sort_order), 0) INTO max_sort_order
    FROM quests
    WHERE family_id = family_record.id;

    -- Add "Child yelling" violation if not exists
    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Yelling / Shouting'
    ) THEN
      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Yelling / Shouting',
        '大喊大叫',
        -10,
        'violation',
        'self',
        'social',
        '📢',
        99,
        max_sort_order + 1
      );

      max_sort_order := max_sort_order + 1;
    END IF;

    -- Add "Parent yelled at child" bonus if not exists
    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Parent yelled at me'
    ) THEN
      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Parent yelled at me',
        '家长对我大喊大叫',
        20,
        'bonus',
        'other',
        'social',
        '🗣️',
        3,
        max_sort_order + 1
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to add quests to existing families
SELECT add_yelling_quests();

-- Drop the function as it's no longer needed
DROP FUNCTION add_yelling_quests();
