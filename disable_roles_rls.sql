-- Temporarily disable RLS on roles table for testing
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- Check that RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'roles' 
AND schemaname = 'public';