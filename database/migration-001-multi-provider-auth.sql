-- =============================================
-- Migration 001: Multi-Provider Authentication
-- Adds support for multiple OAuth providers
-- =============================================

-- Migration metadata
INSERT INTO migration_log (version, name, description) VALUES 
(1, 'multi-provider-auth', 'Add multi-provider authentication support')
ON CONFLICT (version) DO NOTHING;

BEGIN;

-- =============================================
-- 1. Update existing members table
-- =============================================

-- Add new columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github', 'facebook', 'apple', 'discord')),
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Update status column constraint
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;
ALTER TABLE members ADD CONSTRAINT members_status_check 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- =============================================
-- 2. Create provider_accounts table
-- =============================================

CREATE TABLE IF NOT EXISTS provider_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'github', 'facebook', 'apple', 'discord')),
  provider_account_id TEXT NOT NULL,
  provider_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  scope TEXT,
  token_expires_at TIMESTAMP,
  provider_data JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  linked_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique provider + provider_account_id combination
  UNIQUE(provider, provider_account_id),
  -- Ensure only one primary provider per user
  UNIQUE(member_id, is_primary) WHERE is_primary = TRUE
);

-- =============================================
-- 3. Create user_sessions table
-- =============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'github', 'facebook', 'apple', 'discord')),
  device_fingerprint TEXT,
  user_agent TEXT,
  ip_address INET,
  location JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_active_session_token UNIQUE(session_token)
);

-- =============================================
-- 4. Create indexes
-- =============================================

-- Provider accounts indexes
CREATE INDEX IF NOT EXISTS idx_provider_accounts_member_id ON provider_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_provider_accounts_provider_lookup ON provider_accounts(provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_provider_accounts_primary ON provider_accounts(member_id, is_primary) WHERE is_primary = TRUE;

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_member_id ON user_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(member_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = TRUE;

-- =============================================
-- 5. Enable RLS on new tables
-- =============================================

ALTER TABLE provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. Create RLS policies
-- =============================================

-- Provider accounts policies
CREATE POLICY IF NOT EXISTS "Users can view own provider accounts" ON provider_accounts
    FOR SELECT USING (member_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own provider accounts" ON provider_accounts
    FOR INSERT WITH CHECK (member_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own provider accounts" ON provider_accounts
    FOR UPDATE USING (member_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete own provider accounts" ON provider_accounts
    FOR DELETE USING (member_id = auth.uid());

-- User sessions policies
CREATE POLICY IF NOT EXISTS "Users can view own sessions" ON user_sessions
    FOR SELECT USING (member_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own sessions" ON user_sessions
    FOR INSERT WITH CHECK (member_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own sessions" ON user_sessions
    FOR UPDATE USING (member_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete own sessions" ON user_sessions
    FOR DELETE USING (member_id = auth.uid());

-- =============================================
-- 7. Add triggers
-- =============================================

-- Update triggers for new tables
DROP TRIGGER IF EXISTS update_provider_accounts_updated_at ON provider_accounts;
CREATE TRIGGER update_provider_accounts_updated_at BEFORE UPDATE ON provider_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. Migrate existing data
-- =============================================

-- Create provider accounts for existing email users
INSERT INTO provider_accounts (
    member_id,
    provider,
    provider_account_id,
    provider_email,
    is_primary,
    verified,
    linked_at
)
SELECT 
    id,
    'email',
    id::text,
    email,
    TRUE,
    email_verified,
    created_at
FROM members
WHERE NOT EXISTS (
    SELECT 1 FROM provider_accounts 
    WHERE provider_accounts.member_id = members.id 
    AND provider_accounts.provider = 'email'
)
ON CONFLICT (provider, provider_account_id) DO NOTHING;

-- Update members table with provider info
UPDATE members 
SET 
    auth_provider = 'email',
    provider_id = id::text,
    email_verified = COALESCE(email_verified, FALSE)
WHERE auth_provider IS NULL;

-- =============================================
-- 9. Create migration log table if it doesn't exist
-- =============================================

CREATE TABLE IF NOT EXISTS migration_log (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    applied_at TIMESTAMP DEFAULT NOW()
);

COMMIT;

-- =============================================
-- Verification
-- =============================================

-- Verify migration completed successfully
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Check that new tables exist
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('provider_accounts', 'user_sessions');
    
    IF table_count != 2 THEN
        RAISE EXCEPTION 'Migration failed: Expected 2 new tables, found %', table_count;
    END IF;
    
    -- Check that columns were added to members
    SELECT COUNT(*) INTO table_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'members'
    AND column_name IN ('auth_provider', 'provider_id', 'email_verified');
    
    IF table_count != 3 THEN
        RAISE EXCEPTION 'Migration failed: Expected 3 new columns in members table, found %', table_count;
    END IF;
    
    RAISE NOTICE 'Migration 001 completed successfully';
END $$;