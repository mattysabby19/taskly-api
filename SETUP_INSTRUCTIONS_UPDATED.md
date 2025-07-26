# 🚀 EquiTasklyApp Database Setup Instructions (UPDATED)

## 🚨 Important: Use the Fixed Setup Script

**Use `00_complete_setup_fixed.sql` instead of `00_complete_setup.sql`**

The original script had an issue with immutable functions in index predicates. The fixed version resolves this PostgreSQL compatibility issue.

## 📋 Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **New Supabase Project**: Create a new project in your Supabase dashboard
3. **Database Access**: Ensure you have access to the SQL Editor in your Supabase project

## 🎯 Step-by-Step Setup

### Step 1: Access Supabase SQL Editor

1. **Login to Supabase**: Go to [app.supabase.com](https://app.supabase.com)
2. **Select Your Project**: Click on your EquiTasklyApp project
3. **Open SQL Editor**: 
   - Click on "SQL Editor" in the left sidebar
   - Or go to `https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql`

### Step 2: Run the Fixed Setup Script

1. **Open the Fixed Setup File**: Navigate to `EquiTaskly-Api/database/00_complete_setup_fixed.sql`

2. **Copy the Script**: 
   - Open the `00_complete_setup_fixed.sql` file
   - Select all content (Ctrl+A / Cmd+A)
   - Copy the entire script (Ctrl+C / Cmd+C)

3. **Execute in Supabase**:
   - In the Supabase SQL Editor, create a new query
   - Paste the entire script into the editor
   - Click "Run" button (or press Ctrl+Enter / Cmd+Enter)

4. **Wait for Completion**: 
   - The script will take 30-60 seconds to complete
   - Watch for success messages in the Results panel
   - Look for the final verification message: "✅ DATABASE SETUP COMPLETED SUCCESSFULLY!"

### Step 3: Verify Installation

After running the script, you should see output similar to:
```
🎉 =================================
🎉 DATABASE SETUP VERIFICATION
🎉 =================================

📊 Setup Results:
   • Tables created: 17 (expected: 13+)
   • Functions created: 4 (expected: 4)
   • System roles created: 4 (expected: 4)
   • Permissions created: 21 (expected: 21+)
   • Indexes created: 23 (expected: 20+)

✅ DATABASE SETUP COMPLETED SUCCESSFULLY!

🚀 Next Steps:
   1. Configure your environment variables
   2. Set up OAuth providers in Supabase dashboard
   3. Test user creation through your app
   4. Run post_setup_verification.sql for additional testing
```

## 🔧 What Was Fixed

### **Issue**: Index Predicate Function Error
**Error Message**: `ERROR: 42P17: functions in index predicate must be marked IMMUTABLE`

### **Root Cause**: 
The original script included an index with a `NOW()` function in the WHERE clause:
```sql
-- PROBLEMATIC (original)
CREATE INDEX idx_rate_limit_cleanup ON rate_limit_log(reset_at) WHERE reset_at < NOW();
```

### **Solution**:
Replaced with a simple index without the predicate:
```sql
-- FIXED
CREATE INDEX idx_rate_limit_expired ON rate_limit_log(reset_at);
```

Added a cleanup function instead:
```sql
-- Added cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limit_log WHERE reset_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🎯 Enhanced Features in Fixed Version

### **Additional Improvements**:
1. **Better Error Handling**: More robust function definitions
2. **Cleanup Function**: Added `cleanup_expired_rate_limits()` function
3. **Enhanced Verification**: More detailed setup verification output
4. **Index Optimization**: Removed problematic predicates, maintained performance

### **New Functions Added**:
- `cleanup_expired_rate_limits()` - Manually clean expired rate limit entries
- Enhanced verification output with detailed metrics

## 📊 Complete Database Schema (17+ Tables)

### **Core Authentication & Authorization**
- `members` - User profiles with GDPR compliance
- `groups` - Households/organizations  
- `roles` - RBAC role definitions (admin, member, analytics_viewer, viewer)
- `permissions` - Fine-grained permissions (21+ permissions)
- `role_permissions` - Role-permission mappings
- `group_memberships` - Multi-tenancy support
- `group_invitations` - Invitation system

### **Session Management & Security**
- `user_sessions` - Single session management
- `member_biometrics` - Biometric authentication data
- `audit_log` - Comprehensive activity tracking
- `security_incidents` - Threat detection and management
- `rate_limit_log` - API rate limiting tracking

### **GDPR Compliance**
- `data_consent` - Consent tracking (analytics, marketing, functional)
- `data_processing_log` - GDPR audit trail
- `data_deletion_requests` - Right to be forgotten

### **Core Business Logic**
- `tasks` - Task management
- `categories` - Task categorization
- `task_comments` - Task discussions
- `task_attachments` - File uploads

### **System Management**
- `migration_log` - Schema versioning

## 🔐 Security Features Included

- **Row Level Security (RLS)** enabled on all tables
- **JWT token validation** with Supabase Auth
- **Single session policy** (new login revokes previous)
- **Biometric authentication** support
- **Offline token validation** for mobile apps
- **Real-time security monitoring**
- **Comprehensive audit logging**
- **Rate limiting infrastructure**

## 🌍 GDPR Compliance Features

- **Consent management** for analytics, marketing, functional data
- **Complete data export** functionality
- **Right to be forgotten** with full/partial deletion
- **Data processing logs** for compliance audits
- **Privacy policy version tracking**

## 🚀 Next Steps After Database Setup

### Step 4: Configure Environment Variables

Create/update your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Security Configuration
ENCRYPTION_KEY=your_32_character_encryption_key_here
JWT_SECRET=your_jwt_secret_here

# Application URLs
FRONTEND_URL=http://localhost:3000
MOBILE_APP_URL=http://localhost:19006
BASE_URL=http://localhost:3001
```

**To find your Supabase keys:**
1. Go to Project Settings > API in your Supabase dashboard
2. Copy the Project URL (SUPABASE_URL)
3. Copy the anon/public key (SUPABASE_ANON_KEY)
4. Copy the service_role key (SUPABASE_SERVICE_KEY) - **Keep this secret!**

### Step 5: Configure OAuth Providers (Optional)

1. **Go to Authentication > Providers** in your Supabase dashboard
2. **Enable desired providers**:
   - ✅ Email (already enabled)
   - ✅ Google
   - ✅ GitHub  
   - ✅ Facebook
   - ✅ Apple
   - ✅ Discord

3. **For each OAuth provider**, set the redirect URL to:
   ```
   https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback
   ```

### Step 6: Test the Setup

1. **Verify Tables**: Go to Table Editor in Supabase dashboard
2. **Check RLS**: Ensure Row Level Security is enabled on tables
3. **Test Authentication**: Try creating a user through your app
4. **Run Verification Script**: Execute `post_setup_verification.sql`

## 🆘 Troubleshooting the Fixed Version

### **If you still get errors:**

1. **Check PostgreSQL Version**: Ensure you're using PostgreSQL 13+
2. **Review Error Messages**: Look for specific table or function errors
3. **Clear Previous Attempts**: Drop any partially created tables if needed
4. **Check Permissions**: Ensure you have sufficient database permissions

### **Common Solutions:**

```sql
-- If you need to start over, drop existing tables:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run the fixed setup script again
```

### **Verify Successful Setup:**

```sql
-- Check all tables were created
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check functions were created  
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Check roles and permissions
SELECT COUNT(*) FROM roles;
SELECT COUNT(*) FROM permissions;
```

## ✅ Success Verification

Your setup is successful when you see:
- ✅ 17+ tables created
- ✅ 4 functions created (including the new cleanup function)
- ✅ 4 system roles created
- ✅ 21+ permissions created  
- ✅ 20+ indexes created
- ✅ RLS enabled on all tables
- ✅ No error messages in the execution log

## 🎉 You're Ready!

Once the fixed setup completes successfully, you have:
- ✅ **Enterprise-grade authentication** with multi-provider support
- ✅ **RBAC system** with analytics viewer role
- ✅ **Multi-tenancy** for household/work contexts
- ✅ **Mobile security** with biometric auth and offline tokens
- ✅ **Single session management** with auto-logout
- ✅ **GDPR compliance** with consent management and data rights
- ✅ **Security monitoring** with real-time threat detection
- ✅ **Production-ready** scalable architecture

Your EquiTasklyApp database is now ready for development and deployment! 🚀