-- Fix signup issues by ensuring all required tables and data exist
BEGIN;

-- 1. Ensure roles table exists with admin role
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert admin role if it doesn't exist
INSERT INTO roles (name, description, permissions)
VALUES ('admin', 'Administrator role with full permissions', '{"all": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert member role if it doesn't exist
INSERT INTO roles (name, description, permissions)
VALUES ('member', 'Regular member role', '{"read": true, "write": true}')
ON CONFLICT (name) DO NOTHING;

-- 2. Ensure groups table exists
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'Household',
    type TEXT DEFAULT 'personal',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Ensure members table exists
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Ensure group_memberships table exists
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(member_id, group_id)
);

-- 5. Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers if they exist, then recreate
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
DROP TRIGGER IF EXISTS update_group_memberships_updated_at ON group_memberships;

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at 
    BEFORE UPDATE ON members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_memberships_updated_at 
    BEFORE UPDATE ON group_memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verify setup
SELECT 'VERIFICATION RESULTS' as status;

SELECT 'Roles' as table_name, COUNT(*) as count FROM roles;
SELECT 'Groups' as table_name, COUNT(*) as count FROM groups;
SELECT 'Members' as table_name, COUNT(*) as count FROM members;
SELECT 'Group Memberships' as table_name, COUNT(*) as count FROM group_memberships;

-- Show available roles
SELECT 'Available Roles:' as info, name, id FROM roles;