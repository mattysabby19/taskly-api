-- Re-enable RLS on roles table (policies already exist)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'roles' 
AND schemaname = 'public';