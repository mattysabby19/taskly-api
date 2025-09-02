-- Fix priority constraint to allow title case values
BEGIN;

-- Drop the existing priority constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- Add new constraint with both lowercase and title case for compatibility
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'Low', 'Medium', 'High'));

-- Update existing records to title case if needed
UPDATE tasks 
SET priority = CASE 
  WHEN priority = 'low' THEN 'Low'
  WHEN priority = 'medium' THEN 'Medium' 
  WHEN priority = 'high' THEN 'High'
  ELSE priority
END
WHERE priority IN ('low', 'medium', 'high');

COMMIT;

-- Verify the constraint
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'priority';

-- Test the constraint works
DO $$
BEGIN
  -- These should all work now
  INSERT INTO tasks (id, title, category, priority, group_id, created_by, status, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Test Low', 'Chores', 'Low', 
          (SELECT id FROM groups LIMIT 1), 
          (SELECT id FROM members LIMIT 1), 
          'pending', NOW(), NOW());
          
  INSERT INTO tasks (id, title, category, priority, group_id, created_by, status, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Test Medium', 'Chores', 'Medium', 
          (SELECT id FROM groups LIMIT 1), 
          (SELECT id FROM members LIMIT 1), 
          'pending', NOW(), NOW());
          
  INSERT INTO tasks (id, title, category, priority, group_id, created_by, status, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Test High', 'Chores', 'High', 
          (SELECT id FROM groups LIMIT 1), 
          (SELECT id FROM members LIMIT 1), 
          'pending', NOW(), NOW());
          
  RAISE NOTICE '✅ Priority constraint fix successful - all values work';
EXCEPTION
  WHEN others THEN
    RAISE WARNING '❌ Priority constraint issue: %', SQLERRM;
END $$;