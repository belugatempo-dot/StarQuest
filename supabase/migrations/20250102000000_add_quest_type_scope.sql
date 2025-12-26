-- Migration: Add type, scope, and max_per_day fields to quests table
-- This migration adds the new quest classification system

-- Add new columns to quests table
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'bonus' CHECK (type IN ('duty', 'bonus', 'violation')),
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'self' CHECK (scope IN ('self', 'family', 'other')),
  ADD COLUMN IF NOT EXISTS max_per_day INTEGER DEFAULT 1;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
CREATE INDEX IF NOT EXISTS idx_quests_scope ON quests(scope);

-- Update existing data based on stars value
-- Positive stars = bonus quests
UPDATE quests
SET type = 'bonus',
    scope = 'self'
WHERE stars > 0 AND type IS NULL;

-- Negative stars = duty (default, could also be violations)
UPDATE quests
SET type = 'duty',
    scope = 'self'
WHERE stars < 0 AND type IS NULL;

-- Note: The is_positive field is kept for backward compatibility
-- but the type field should be used going forward

-- Comment explaining the new system
COMMENT ON COLUMN quests.type IS 'Quest type: duty (should do, miss = deduct), bonus (extra effort = earn), violation (bad behavior = deduct)';
COMMENT ON COLUMN quests.scope IS 'Quest scope: self (for oneself), family (help family), other (help others outside family)';
COMMENT ON COLUMN quests.max_per_day IS 'Maximum number of times this quest can be recorded per day';
