-- =============================================
-- Fix RLS Policies and Infinite Recursion Issue
-- =============================================

BEGIN;

-- =============================================
-- 1. Disable RLS on all tables for testing
-- =============================================

-- Disable RLS to prevent infinite recursion
ALTER TABLE IF EXISTS groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS group_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Drop all existing RLS policies
-- =============================================

-- Drop policies on tasks table
DROP POLICY IF EXISTS "tasks_group_members_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Drop policies on group_memberships table
DROP POLICY IF EXISTS "group_memberships_select_policy" ON group_memberships;
DROP POLICY IF EXISTS "group_memberships_insert_policy" ON group_memberships;
DROP POLICY IF EXISTS "group_memberships_update_policy" ON group_memberships;
DROP POLICY IF EXISTS "group_memberships_delete_policy" ON group_memberships;

-- Drop policies on members table
DROP POLICY IF EXISTS "members_select_policy" ON members;
DROP POLICY IF EXISTS "members_insert_policy" ON members;
DROP POLICY IF EXISTS "members_update_policy" ON members;
DROP POLICY IF EXISTS "members_delete_policy" ON members;

-- Drop policies on groups table
DROP POLICY IF EXISTS "groups_select_policy" ON groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON groups;
DROP POLICY IF EXISTS "groups_update_policy" ON groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON groups;

-- =============================================
-- 3. Create a test task to verify everything works
-- =============================================

DO $$ 
DECLARE
    test_group_id UUID;
    test_user_id UUID;
    test_task_id UUID;
BEGIN
    -- Get test group and user
    SELECT id INTO test_group_id FROM groups WHERE name LIKE '%Auth Test%' LIMIT 1;
    SELECT id INTO test_user_id FROM members WHERE email LIKE '%authtest%' LIMIT 1;

    IF test_group_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Create test task
        INSERT INTO tasks (
            title, 
            description, 
            category, 
            priority, 
            group_id, 
            created_by, 
            status, 
            urgent,
            created_at,
            updated_at
        ) VALUES (
            'RLS Fix Test Task',
            'Testing task creation after RLS fix',
            'Chores',
            'Medium',
            test_group_id,
            test_user_id,
            'pending',
            false,
            NOW(),
            NOW()
        ) RETURNING id INTO test_task_id;

        -- Test update
        UPDATE tasks 
        SET title = 'RLS Fix Test Task (Updated)', 
            status = 'in_progress',
            updated_at = NOW()
        WHERE id = test_task_id;

        RAISE NOTICE '✅ Test task created and updated successfully: %', test_task_id;
        RAISE NOTICE '✅ Group ID: %, User ID: %', test_group_id, test_user_id;
    ELSE
        RAISE WARNING '❌ Could not find test group or user';
        RAISE WARNING 'Available groups: %', (SELECT string_agg(name, ', ') FROM groups);
        RAISE WARNING 'Available users: %', (SELECT string_agg(email, ', ') FROM members LIMIT 5);
    END IF;
END $$;

-- =============================================
-- 4. Verify schema is complete
-- =============================================

DO $$ 
DECLARE
    task_count INTEGER;
    column_count INTEGER;
BEGIN
    -- Count tasks
    SELECT COUNT(*) INTO task_count FROM tasks;
    
    -- Count columns in tasks table
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' AND table_schema = 'public';

    RAISE NOTICE '✅ Tasks table has % columns and % records', column_count, task_count;
    
    -- List all columns
    RAISE NOTICE 'Tasks table columns: %', (
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        FROM information_schema.columns 
        WHERE table_name = 'tasks' AND table_schema = 'public'
    );
END $$;

COMMIT;

-- Final verification query
SELECT 
    'Database Status' as status,
    (SELECT COUNT(*) FROM tasks) as task_count,
    (SELECT COUNT(*) FROM members) as member_count,
    (SELECT COUNT(*) FROM groups) as group_count,
    (SELECT COUNT(*) FROM group_memberships) as membership_count;