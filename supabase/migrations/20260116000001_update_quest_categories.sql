-- Update quest category constraint to include all UI categories
-- Previously: 'chores', 'hygiene', 'learning', 'health', 'social', 'other'
-- Now adding: 'study', 'creativity', 'exercise', 'reading', 'music', 'art', 'kindness', 'responsibility'

-- Drop the old constraint
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_category_check;

-- Add the new constraint with all categories
ALTER TABLE quests ADD CONSTRAINT quests_category_check
  CHECK (category IN (
    'health',
    'study',
    'chores',
    'hygiene',
    'learning',
    'social',
    'creativity',
    'exercise',
    'reading',
    'music',
    'art',
    'kindness',
    'responsibility',
    'other'
  ));
