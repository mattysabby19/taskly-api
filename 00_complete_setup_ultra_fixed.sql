-- =============================================
-- EquiTasklyApp Complete Database Setup Script (ULTRA FIXED)
-- Run this script in your Supabase SQL Editor
-- =============================================

-- This script will create the entire database schema from scratch
-- including all tables, functions, triggers, policies, and initial data
-- FIXED: Removed all potentially problematic index predicates

BEGIN;

-- =============================================
-- 1. Enable Required Extensions
-- =============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. Create Core Tables
-- =============================================

-- Groups table (households/organizations)
CREATE TABLE IF NOT EXISTS groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    plan TEXT DEFAULT 'Household' CHECK (plan IN ('Household', 'Premium', 'Enterprise')),
    type TEXT DEFAULT 'personal' CHECK (type IN ('personal', 'family', 'business')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    max_members INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced members table with GDPR and security fields
CREATE TABLE IF NOT EXISTS members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,
    auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github', 'facebook', 'apple', 'discord')),
    provider_id TEXT,
    password_hash TEXT, -- Only for email auth
    email_verified BOOLEAN DEFAULT FALSE,
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    preferences JSONB DEFAULT '{}',
    
    -- GDPR Compliance fields
    marketing_consent BOOLEAN DEFAULT FALSE,
    analytics_consent BOOLEAN DEFAULT TRUE,
    data_processing_consent BOOLEAN DEFAULT TRUE,
    privacy_policy_accepted_at TIMESTAMP,
    privacy_policy_version TEXT,
    
    -- Security fields
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    deletion_requested_at TIMESTAMP,
    anonymized_at TIMESTAMP,
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 3. Create RBAC System Tables
-- =============================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_role_name CHECK (name ~ '^[a-z_]+$')
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    resource TEXT NOT NULL, -- tasks, groups, members, analytics, etc.
    action TEXT NOT NULL, -- create, read, update, delete, assign, view
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_permission_name CHECK (name ~ '^[a-z_:]+$')
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID REFERENCES members(id), -- Who granted this permission
    
    PRIMARY KEY (role_id, permission_id)
);

-- =============================================
-- 4. Create Multi-Tenancy Tables
-- =============================================

-- Group memberships table (replaces simple group_id in members)
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    invited_by UUID REFERENCES members(id), -- Who invited this member
    invitation_token TEXT, -- For pending invitations
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'left')),
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    metadata JSONB DEFAULT '{}', -- Group-specific member settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique membership per user per group
    UNIQUE(member_id, group_id)
);

-- Group invitations table for managing pending invitations
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES members(id),
    invitation_token TEXT NOT NULL UNIQUE,
    personal_message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 5. Create Session Management Tables
-- =============================================

-- Enhanced user sessions table for single session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,
    device_id TEXT, -- For device registration
    device_type TEXT CHECK (device_type IN ('mobile', 'web', 'desktop')),
    device_fingerprint TEXT,
    device_name TEXT, -- User-friendly device name
    platform TEXT, -- iOS, Android, Windows, etc.
    app_version TEXT,
    user_agent TEXT,
    ip_address INET,
    location JSONB, -- Geolocation data
    biometric_enabled BOOLEAN DEFAULT FALSE,
    biometric_method TEXT, -- fingerprint, face, voice
    offline_token TEXT, -- For offline validation
    offline_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    auto_logout_at TIMESTAMP, -- Calculated inactivity logout
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revoked_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Member biometrics table (optional, for storing biometric templates)
CREATE TABLE IF NOT EXISTS member_biometrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('fingerprint', 'face', 'voice')),
    template_hash TEXT NOT NULL, -- Encrypted biometric template
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(member_id, method)
);

-- =============================================
-- 6. Create GDPR Compliance Tables
-- =============================================

-- Data consent tracking
CREATE TABLE IF NOT EXISTS data_consent (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('analytics', 'marketing', 'functional')),
    version TEXT NOT NULL, -- Privacy policy version
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP -- For time-limited consent
);

-- Data processing log for GDPR audit trail
CREATE TABLE IF NOT EXISTS data_processing_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    processing_type TEXT NOT NULL, -- 'access', 'export', 'delete', 'update'
    data_type TEXT NOT NULL, -- 'profile', 'tasks', 'analytics'
    purpose TEXT NOT NULL,
    legal_basis TEXT NOT NULL, -- 'consent', 'contract', 'legitimate_interest'
    processor_id UUID REFERENCES members(id), -- Who performed the action
    details JSONB DEFAULT '{}',
    processed_at TIMESTAMP DEFAULT NOW()
);

-- Data deletion requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id),
    request_type TEXT DEFAULT 'full' CHECK (request_type IN ('full', 'partial')),
    data_types TEXT[], -- Specific data types to delete
    reason TEXT,
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES members(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
    notes TEXT
);

-- =============================================
-- 7. Create Security Monitoring Tables
-- =============================================

-- Comprehensive audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL, -- 'auth', 'data', 'admin', 'security'
    action TEXT NOT NULL, -- 'login', 'logout', 'create', 'update', 'delete'
    resource_type TEXT, -- 'task', 'member', 'group', 'session'
    resource_id TEXT,
    actor_id UUID REFERENCES members(id) ON DELETE SET NULL,
    actor_type TEXT DEFAULT 'user', -- 'user', 'system', 'admin'
    target_id UUID, -- ID of affected resource
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}', -- Additional context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    success BOOLEAN DEFAULT TRUE,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Security incidents tracking
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_type TEXT NOT NULL, -- 'brute_force', 'suspicious_login', 'data_breach'
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    ip_address INET,
    details JSONB DEFAULT '{}',
    automated_response TEXT, -- Actions taken automatically
    manual_response TEXT, -- Manual investigation notes
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    detected_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES members(id)
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- IP, user_id, or API key
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'api_key')),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    blocked BOOLEAN DEFAULT FALSE,
    reset_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 8. Create Tasks Tables (Core Business Logic)
-- =============================================

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6', -- Default blue color
    icon TEXT,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES members(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(name, group_id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES members(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    recurring_pattern TEXT, -- 'daily', 'weekly', 'monthly', etc.
    recurring_until TIMESTAMP,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- For subtasks
    tags TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Task comments/notes
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'comment' CHECK (type IN ('comment', 'status_change', 'assignment')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Task attachments
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 9. Create Indexes for Performance (ULTRA FIXED)
-- =============================================

-- Group memberships indexes
CREATE INDEX IF NOT EXISTS idx_group_memberships_member_id ON group_memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_status ON group_memberships(member_id, group_id, role_id, status);

-- Role-based access indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_permissions(role_id, permission_id);

-- Session management indexes (simplified)
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_offline_token ON user_sessions(offline_token);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON user_sessions(member_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON user_sessions(last_activity_at, auto_logout_at, is_active);

-- GDPR compliance indexes (simplified)
CREATE INDEX IF NOT EXISTS idx_consent_member_type ON data_consent(member_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_expires ON data_consent(expires_at);
CREATE INDEX IF NOT EXISTS idx_members_deletion_requests ON members(deletion_requested_at);
CREATE INDEX IF NOT EXISTS idx_consent_by_type ON data_consent(member_id, consent_type, granted);

-- Security monitoring indexes (simplified)
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event_type, action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_group ON audit_log(group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_risk ON audit_log(risk_score, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_security_events ON audit_log(event_type, risk_score, created_at);

-- Rate limiting indexes (simplified)
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_log(identifier, endpoint, reset_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expired ON rate_limit_log(reset_at);

-- Tasks indexes (simplified)
CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Task comments indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author ON task_comments(author_id);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_group_id ON categories(group_id);

-- =============================================
-- 10. Enable Row Level Security
-- =============================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_biometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. Create Helper Functions
-- =============================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    user_id UUID,
    group_id UUID,
    permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM group_memberships gm
        JOIN role_permissions rp ON gm.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE gm.member_id = user_id
        AND gm.group_id = group_id
        AND gm.status = 'active'
        AND p.name = permission_name
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limit_log 
    WHERE reset_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 12. Create Triggers
-- =============================================

-- Update triggers for timestamp management
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_memberships_updated_at BEFORE UPDATE ON group_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_biometrics_updated_at BEFORE UPDATE ON member_biometrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 13. Insert Default Roles and Permissions
-- =============================================

-- Insert system roles
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
    ('admin', 'Administrator', 'Full access to all group features', TRUE),
    ('member', 'Member', 'Standard member with task management access', TRUE),
    ('analytics_viewer', 'Analytics Viewer', 'Can view group analytics and reports', TRUE),
    ('viewer', 'Viewer', 'Read-only access to group content', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    -- Task permissions
    ('tasks:create', 'tasks', 'create', 'Create new tasks'),
    ('tasks:read', 'tasks', 'read', 'View tasks'),
    ('tasks:update', 'tasks', 'update', 'Edit tasks'),
    ('tasks:delete', 'tasks', 'delete', 'Delete tasks'),
    ('tasks:assign', 'tasks', 'assign', 'Assign tasks to members'),
    ('tasks:complete', 'tasks', 'complete', 'Mark tasks as complete'),
    
    -- Member permissions
    ('members:invite', 'members', 'invite', 'Invite new members to group'),
    ('members:remove', 'members', 'remove', 'Remove members from group'),
    ('members:view', 'members', 'view', 'View member profiles'),
    ('members:update_roles', 'members', 'update_roles', 'Change member roles'),
    
    -- Group permissions
    ('groups:create', 'groups', 'create', 'Create new groups'),
    ('groups:update', 'groups', 'update', 'Edit group settings'),
    ('groups:delete', 'groups', 'delete', 'Delete groups'),
    ('groups:view', 'groups', 'view', 'View group information'),
    
    -- Analytics permissions
    ('analytics:view', 'analytics', 'view', 'View analytics and reports'),
    ('analytics:export', 'analytics', 'export', 'Export analytics data'),
    
    -- Categories permissions
    ('categories:create', 'categories', 'create', 'Create new categories'),
    ('categories:update', 'categories', 'update', 'Edit categories'),
    ('categories:delete', 'categories', 'delete', 'Delete categories'),
    ('categories:view', 'categories', 'view', 'View categories'),
    
    -- System permissions
    ('system:admin', 'system', 'admin', 'System administration access')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
WITH role_permission_assignments AS (
    SELECT 
        r.id as role_id,
        p.id as permission_id
    FROM roles r
    CROSS JOIN permissions p
    WHERE 
        -- Admin gets all permissions
        (r.name = 'admin') OR
        -- Member gets basic task and group permissions
        (r.name = 'member' AND p.name IN (
            'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign', 'tasks:complete',
            'members:view', 'groups:view', 'categories:view', 'categories:create', 'categories:update'
        )) OR
        -- Analytics viewer gets analytics permissions plus basic read
        (r.name = 'analytics_viewer' AND p.name IN (
            'tasks:read', 'members:view', 'groups:view', 'analytics:view', 'analytics:export', 'categories:view'
        )) OR
        -- Viewer gets read-only permissions
        (r.name = 'viewer' AND p.name IN (
            'tasks:read', 'members:view', 'groups:view', 'categories:view'
        ))
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_permission_assignments
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================
-- 14. Create Basic RLS Policies
-- =============================================

-- Groups policies
CREATE POLICY "Service role can manage all groups" ON groups
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view groups they belong to" ON groups
    FOR SELECT USING (
        id IN (
            SELECT group_id FROM group_memberships 
            WHERE member_id = auth.uid() AND status = 'active'
        )
    );

-- Members policies  
CREATE POLICY "Service role can manage all members" ON members
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own profile" ON members
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON members
    FOR UPDATE USING (id = auth.uid());

-- Group memberships policies
CREATE POLICY "Service role can manage all group memberships" ON group_memberships
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view memberships of their groups" ON group_memberships
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE member_id = auth.uid() AND status = 'active'
        )
    );

-- Tasks policies
CREATE POLICY "Service role can manage all tasks" ON tasks
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view tasks in their groups" ON tasks
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE member_id = auth.uid() AND status = 'active'
        )
    );

-- Categories policies
CREATE POLICY "Service role can manage all categories" ON categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view categories in their groups" ON categories
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_memberships 
            WHERE member_id = auth.uid() AND status = 'active'
        )
    );

-- Data consent policies
CREATE POLICY "Service role can manage all consent" ON data_consent
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can manage own consent" ON data_consent
    FOR ALL USING (member_id = auth.uid());

-- User sessions policies
CREATE POLICY "Service role can manage all sessions" ON user_sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (member_id = auth.uid());

-- Audit log policies (read-only for users)
CREATE POLICY "Service role can manage all audit logs" ON audit_log
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own audit logs" ON audit_log
    FOR SELECT USING (actor_id = auth.uid());

-- =============================================
-- 15. Grant Permissions
-- =============================================

-- Grant permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions for service role (for server-side operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================
-- 16. Create Migration Log Table
-- =============================================

CREATE TABLE IF NOT EXISTS migration_log (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Record this migration
INSERT INTO migration_log (version, name, description) VALUES 
(1, 'complete-setup-ultra-fixed', 'Complete database setup with enhanced auth and RBAC (Ultra Fixed version)')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =============================================
-- 17. Verification Queries
-- =============================================

-- Run these to verify everything was created correctly
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    role_count INTEGER;
    permission_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'groups', 'members', 'roles', 'permissions', 'role_permissions',
        'group_memberships', 'user_sessions', 'data_consent', 'audit_log',
        'tasks', 'categories', 'task_comments'
    );
    
    -- Check functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('user_has_permission', 'cleanup_expired_rate_limits');
    
    -- Check roles
    SELECT COUNT(*) INTO role_count FROM roles WHERE is_system_role = TRUE;
    
    -- Check permissions
    SELECT COUNT(*) INTO permission_count FROM permissions;
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
    
    -- Report results
    RAISE NOTICE '';
    RAISE NOTICE '🎉 =================================';
    RAISE NOTICE '🎉 DATABASE SETUP VERIFICATION';
    RAISE NOTICE '🎉 =================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Setup Results:';
    RAISE NOTICE '   • Tables created: % (expected: 13+)', table_count;
    RAISE NOTICE '   • Functions created: % (expected: 2+)', function_count;
    RAISE NOTICE '   • System roles created: % (expected: 4)', role_count;
    RAISE NOTICE '   • Permissions created: % (expected: 21+)', permission_count;
    RAISE NOTICE '   • Indexes created: % (expected: 20+)', index_count;
    RAISE NOTICE '';
    
    IF table_count >= 13 AND function_count >= 2 AND role_count = 4 AND permission_count >= 21 THEN
        RAISE NOTICE '✅ DATABASE SETUP COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 Next Steps:';
        RAISE NOTICE '   1. Configure your environment variables';
        RAISE NOTICE '   2. Set up OAuth providers in Supabase dashboard';
        RAISE NOTICE '   3. Test user creation through your app';
        RAISE NOTICE '   4. Your enhanced authentication system is ready!';
    ELSE
        RAISE NOTICE '❌ Database setup may have issues. Please check the logs.';
        RAISE NOTICE '   Expected: 13+ tables, 2+ functions, 4 roles, 21+ permissions';
        RAISE NOTICE '   Actual: % tables, % functions, % roles, % permissions', table_count, function_count, role_count, permission_count;
    END IF;
    RAISE NOTICE '';
END $$;