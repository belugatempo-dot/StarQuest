-- Migration: Add planning, achievement, and learning quests
-- Created: 2026-01-16
-- Description: Adds timetable management, swimming achievements, and observation learning quests

-- Function to add new quests to existing families
CREATE OR REPLACE FUNCTION add_planning_achievement_quests()
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

    -- 1. Add "Missing defined timetable" violation
    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Missing defined timetable'
    ) THEN
      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Missing defined timetable',
        '没有按时间表执行',
        -15,
        'violation',
        'self',
        'responsibility',
        '⏰',
        99,
        max_sort_order + 1
      );
      max_sort_order := max_sort_order + 1;
    END IF;

    -- 2. Add "Proactively set up plan and timetable" bonus
    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Proactively set up plan and timetable'
    ) THEN
      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Proactively set up plan and timetable',
        '主动制定计划和时间表',
        25,
        'bonus',
        'self',
        'responsibility',
        '📅',
        2,
        max_sort_order + 1
      );
      max_sort_order := max_sort_order + 1;
    END IF;

    -- 3. Add "Break own swimming record" bonus
    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Break own swimming record'
    ) THEN
      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Break own swimming record',
        '游泳打破自己的记录',
        30,
        'bonus',
        'self',
        'exercise',
        '🏊',
        3,
        max_sort_order + 1
      );
      max_sort_order := max_sort_order + 1;
    END IF;

    -- 4. Add "Observe and learn from others in competition" bonus
    IF NOT EXISTS (
      SELECT 1 FROM quests
      WHERE family_id = family_record.id
      AND name_en = 'Observe and learn from others in competition'
    ) THEN
      INSERT INTO quests (family_id, name_en, name_zh, stars, type, scope, category, icon, max_per_day, sort_order)
      VALUES (
        family_record.id,
        'Observe and learn from others in competition',
        '比赛时认真观察学习他人优缺点',
        20,
        'bonus',
        'other',
        'learning',
        '👀',
        3,
        max_sort_order + 1
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to add quests to existing families
SELECT add_planning_achievement_quests();

-- Drop the function as it's no longer needed
DROP FUNCTION add_planning_achievement_quests();
