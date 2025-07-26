-- Migration: Add multi-provider authentication support
-- File: database/migrations/001_add_multi_provider_auth.sql

-- Add auth provider columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for provider lookups
CREATE INDEX IF NOT EXISTS idx_members_provider_id ON members(auth_provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email) WHERE email IS NOT NULL;

-- Add constraint to ensure provider_id is unique per provider
ALTER TABLE members 
ADD CONSTRAINT unique_provider_id 
UNIQUE (auth_provider, provider_id)
DEFERRABLE INITIALLY DEFERRED;

-- Make email nullable for OAuth users who might not provide email
ALTER TABLE members ALTER COLUMN email DROP NOT NULL;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have default auth provider
UPDATE members 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;

-- Add check constraint for valid auth providers
ALTER TABLE members 
ADD CONSTRAINT check_auth_provider 
CHECK (auth_provider IN ('email', 'google', 'github', 'facebook', 'apple', 'discord'));

-- Create provider_accounts table for managing multiple linked accounts
CREATE TABLE IF NOT EXISTS provider_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    provider_name VARCHAR(255),
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_provider_account UNIQUE (provider, provider_id),
    CONSTRAINT check_provider CHECK (provider IN ('email', 'google', 'github', 'facebook', 'apple', 'discord'))
);

-- Create indexes for provider_accounts
CREATE INDEX idx_provider_accounts_user_id ON provider_accounts(user_id);
CREATE INDEX idx_provider_accounts_provider ON provider_accounts(provider);
CREATE INDEX idx_provider_accounts_provider_id ON provider_accounts(provider, provider_id);

-- Create trigger for provider_accounts updated_at
DROP TRIGGER IF EXISTS update_provider_accounts_updated_at ON provider_accounts;
CREATE TRIGGER update_provider_accounts_updated_at
    BEFORE UPDATE ON provider_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create sessions table for managing user sessions across providers
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_session_provider CHECK (provider IN ('email', 'google', 'github', 'facebook', 'apple', 'discord'))
);

-- Create indexes for user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Create trigger for user_sessions updated_at
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE members IS 'User accounts with multi-provider authentication support';
COMMENT ON COLUMN members.auth_provider IS 'Primary authentication provider (email, google, github, etc.)';
COMMENT ON COLUMN members.provider_id IS 'Unique identifier from the authentication provider';
COMMENT ON COLUMN members.avatar_url IS 'Profile picture URL from authentication provider';

COMMENT ON TABLE provider_accounts IS 'Linked authentication provider accounts for users';
COMMENT ON TABLE user_sessions IS 'Active user sessions with token management';

-- Grant necessary permissions (adjust based on your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON members TO your_api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON provider_accounts TO your_api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO your_api_user;