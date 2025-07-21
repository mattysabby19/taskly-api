-- QUICK TEST: Temporarily disable RLS on groups table
-- Run this for immediate testing (not recommended for production)

ALTER TABLE groups DISABLE ROW LEVEL SECURITY;

-- Re-enable with proper policies later:
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;