-- Migration: Add new violation quests (spanking and teasing)
-- Created: 2026-01-16
-- Description: Adds "打人屁股" and "撩人" as violation quests

-- Function to add new violation quests to existing families
CREATE OR REPLACE FUNCTION add_new_violation_quests()
RETURNS void AS $$
DECLARE
  family_record RECORD;
BEGIN
  -- Loop through all families
  FOR family_record IN SELECT id FROM families LOOP
    -- Check if quests already exist to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Spanking / Hitting buttocks'
    ) THEN
      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Spanking / Hitting buttocks',
        '打人屁股',
        -40,
        'violation',
        'self',
        'social',
        '🍑',
        99,
        37
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Inappropriate teasing / Harassment'
    ) THEN
      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Inappropriate teasing / Harassment',
        '撩人/不当骚扰',
        -25,
        'violation',
        'self',
        'social',
        '😏',
        99,
        38
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to add quests to existing families
SELECT add_new_violation_quests();

-- Drop the function as it's no longer needed
DROP FUNCTION add_new_violation_quests();
