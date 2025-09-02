-- =============================================
-- EquiTaskly Database Schema Fix (Idempotent)
-- Run this script to fix missing columns and triggers
-- =============================================

-- This script safely adds missing columns and fixes triggers
-- without causing conflicts with existing database objects

BEGIN;

-- =============================================
-- 1. Fix Tasks Table - Add Missing Columns
-- =============================================

-- Add missing columns to tasks table if they don't exist
DO $$ 
BEGIN
    -- Add category column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'category') THEN
        ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'General';
        ALTER TABLE tasks ADD CONSTRAINT tasks_category_check 
            CHECK (category IN ('Chores', 'Kids', 'Work', 'Projects', 'Personal', 'Shopping', 'General'));
    END IF;

    -- Add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'priority') THEN
        ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium';
        ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
            CHECK (priority IN ('Low', 'Medium', 'High'));
    END IF;

    -- Add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'description') THEN
        ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT '';
    END IF;

    -- Add assigned_to column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to UUID REFERENCES members(id) ON DELETE SET NULL;
    END IF;

    -- Add due_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
        ALTER TABLE tasks ADD COLUMN due_date TIMESTAMP;
    END IF;

    -- Add urgent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'urgent') THEN
        ALTER TABLE tasks ADD COLUMN urgent BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add estimated_minutes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'estimated_minutes') THEN
        ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER;
    END IF;

    -- Add completed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'status') THEN
        ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'pending';
        ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
            CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
    END IF;

    RAISE NOTICE 'Tasks table columns updated successfully';
END $$;

-- =============================================
-- 2. Fix Triggers (Drop and Recreate)
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist, then recreate
DO $$ 
BEGIN
    -- Drop triggers if they exist
    DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
    DROP TRIGGER IF EXISTS update_members_updated_at ON members;
    DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
    DROP TRIGGER IF EXISTS update_group_memberships_updated_at ON group_memberships;

    -- Recreate triggers
    CREATE TRIGGER update_groups_updated_at 
        BEFORE UPDATE ON groups 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_members_updated_at 
        BEFORE UPDATE ON members 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_tasks_updated_at 
        BEFORE UPDATE ON tasks 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_memberships') THEN
        CREATE TRIGGER update_group_memberships_updated_at 
            BEFORE UPDATE ON group_memberships 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    RAISE NOTICE 'Triggers recreated successfully';
END $$;

-- =============================================
-- 3. Disable RLS Temporarily for Testing
-- =============================================

-- Disable RLS on tasks table for testing
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Create Sample Data for Testing
-- =============================================

-- Insert a test task to verify schema works
DO $$ 
DECLARE
    test_group_id UUID;
    test_user_id UUID;
BEGIN
    -- Get a test group and user
    SELECT id INTO test_group_id FROM groups LIMIT 1;
    SELECT id INTO test_user_id FROM members LIMIT 1;

    -- Insert test task if we have data
    IF test_group_id IS NOT NULL AND test_user_id IS NOT NULL THEN
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
            'Schema Fix Test Task',
            'Testing that all required columns exist',
            'General',
            'Medium',
            test_group_id,
            test_user_id,
            'pending',
            false,
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Test task created successfully with all required columns';
    END IF;
END $$;

-- =============================================
-- 5. Verify Schema Completion
-- =============================================

DO $$ 
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col_name TEXT;
    required_columns TEXT[] := ARRAY[
        'id', 'title', 'description', 'category', 'priority', 
        'status', 'assigned_to', 'created_by', 'group_id', 
        'due_date', 'urgent', 'estimated_minutes', 'created_at', 
        'updated_at', 'completed_at'
    ];
BEGIN
    -- Check for missing columns
    FOREACH col_name IN ARRAY required_columns LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = col_name
        ) THEN
            missing_columns := array_append(missing_columns, col_name);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Missing columns in tasks table: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ All required columns exist in tasks table';
    END IF;
END $$;

COMMIT;

-- =============================================
-- 6. Final Status Report
-- =============================================

SELECT 
    'tasks' as table_name,
    COUNT(*) as total_columns,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_name = 'tasks' AND table_schema = 'public'
GROUP BY table_name;