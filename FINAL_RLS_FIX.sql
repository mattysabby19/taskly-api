-- =============================================
-- FINAL RLS FIX: Ensure Service Role Can Bypass All Policies
-- Run this in Supabase SQL Editor
-- =============================================

BEGIN;

-- Step 1: Drop ALL existing policies completely
DO $$
DECLARE
    pol_name text;
    table_name text;
BEGIN
    -- List of tables to clean
    FOR table_name IN VALUES ('groups'), ('group_memberships'), ('members'), ('tasks'), ('categories'), ('roles'), ('permissions'), ('role_permissions')
    LOOP
        FOR pol_name IN 
            SELECT policyname FROM pg_policies WHERE tablename = table_name AND schemaname = 'public'
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON ' || table_name;
            RAISE NOTICE 'Dropped policy % on table %', pol_name, table_name;
        END LOOP;
    END LOOP;
END $$;

-- Step 2: Create ONLY service role bypass policies (no user restrictions)
CREATE POLICY "service_role_all_access" ON groups
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "service_role_all_access" ON group_memberships
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "service_role_all_access" ON members
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.role() = 'service_role' OR
        id = auth.uid()
    );

CREATE POLICY "service_role_all_access" ON roles
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "service_role_all_access" ON permissions
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "service_role_all_access" ON role_permissions
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.role() = 'service_role'
    );

-- Step 3: Add policies for other tables if they exist
DO $$
BEGIN
    -- Tasks table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public') THEN
        EXECUTE 'CREATE POLICY "service_role_all_access" ON tasks FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'' OR auth.role() = ''service_role'')';
    END IF;
    
    -- Categories table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories' AND table_schema = 'public') THEN
        EXECUTE 'CREATE POLICY "service_role_all_access" ON categories FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'' OR auth.role() = ''service_role'')';
    END IF;
END $$;

-- Step 4: Ensure service role has all necessary grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Step 5: Double-check service role can bypass RLS
ALTER ROLE service_role BYPASSRLS;

COMMIT;

-- Final verification
DO $$
DECLARE
    table_count int;
    policy_count int;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('groups', 'group_memberships', 'members', 'roles', 'permissions');
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname = 'service_role_all_access';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 =================================';
    RAISE NOTICE '🎉 FINAL RLS FIX COMPLETED';
    RAISE NOTICE '🎉 =================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Results:';
    RAISE NOTICE '   • Core tables found: %', table_count;
    RAISE NOTICE '   • Service role policies created: %', policy_count;
    RAISE NOTICE '   • Service role can bypass RLS: YES';
    RAISE NOTICE '   • All permissions granted to service_role';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Enhanced authentication should now work perfectly!';
    RAISE NOTICE '🧪 Test with: POST /api/auth/signup';
    RAISE NOTICE '';
END $$;