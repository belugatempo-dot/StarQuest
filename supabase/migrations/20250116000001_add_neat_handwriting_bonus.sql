-- Migration: Add "Neat Hand writing" bonus quest
-- Created: 2026-01-16
-- Description: Adds "整洁书写" (Neat handwriting) as a bonus quest for self-improvement

-- Function to add neat handwriting bonus to existing families
CREATE OR REPLACE FUNCTION add_neat_handwriting_bonus()
RETURNS void AS $$
DECLARE
  family_record RECORD;
  max_sort_order INTEGER;
BEGIN
  -- Loop through all families
  FOR family_record IN SELECT id FROM families LOOP
    -- Check if quest already exists to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Neat handwriting'
    ) THEN
      -- Get the current max sort_order for this family
      SELECT COALESCE(MAX(sort_order), 0) INTO max_sort_order
      FROM quests
      WHERE family_id = family_record.id;

      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Neat handwriting',
        '整洁书写',
        10,
        'bonus',
        'self',
        'learning',
        '✍️',
        3,
        max_sort_order + 1
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to add quest to existing families
SELECT add_neat_handwriting_bonus();

-- Drop the function as it's no longer needed
DROP FUNCTION add_neat_handwriting_bonus();
