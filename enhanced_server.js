const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// Add CORS headers for mobile app access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Enhanced signup with full group and role management
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('🚀 Starting enhanced signup for:', email);

    // Step 1: Create Supabase auth user with email confirmed
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name || 'User',
        auth_provider: 'email',
        email_verified: true
      }
    });

    if (authError) {
      console.error('❌ Auth creation failed:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    console.log('✅ Supabase user created:', authData.user.id);

    // Step 2: Create group first
    const groupId = uuidv4();
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        id: groupId,
        name: `${name || 'User'}'s Household`,
        plan: 'Household',
        type: 'personal',
        status: 'active'
      })
      .select()
      .single();

    if (groupError) {
      console.error('❌ Group creation failed:', groupError);
      throw new Error(`Group creation failed: ${groupError.message}`);
    }
    console.log('✅ Group created:', groupData.id);

    // Step 3: Create member record
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        name: name || 'User',
        status: 'active'
      })
      .select()
      .single();

    if (memberError) {
      console.error('❌ Member creation failed:', memberError);
      throw new Error(`Member creation failed: ${memberError.message}`);
    }
    console.log('✅ Member record created:', memberData.id);

    // Step 4: Get admin role ID
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.error('❌ Admin role not found:', roleError);
      throw new Error('Admin role not found in database');
    }
    console.log('✅ Admin role found:', adminRole.id);

    // Step 5: Create group membership with admin role
    const { data: membershipData, error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        member_id: authData.user.id,
        group_id: groupId,
        role_id: adminRole.id,
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (membershipError) {
      console.error('❌ Membership creation failed:', membershipError);
      throw new Error(`Membership creation failed: ${membershipError.message}`);
    }
    console.log('✅ Group membership created');

    // Step 6: Create session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: authData.user.email
    });

    const token = sessionData?.properties?.access_token || 'temp-token';

    // Return success response
    res.json({
      success: true,
      message: 'User created successfully with enhanced auth',
      token: token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name || 'User',
        provider: 'email',
        memberships: [{
          group_id: groupId,
          role: 'admin',
          status: 'active'
        }]
      },
      group: {
        id: groupId,
        name: `${name || 'User'}'s Household`
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Signup failed',
      details: {}
    });
  }
});

// Enhanced login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('🔐 Enhanced login for:', email);

    // Step 1: Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('❌ Login failed:', authError);
      
      let errorMessage = 'Login failed';
      if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before logging in';
      } else if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      }
      
      return res.status(401).json({
        success: false,
        error: errorMessage,
        details: authError.message
      });
    }
    console.log('✅ Authentication successful');

    // Step 2: Get member profile (simplified query to avoid RLS issues)
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (memberError) {
      console.error('❌ Member data fetch failed:', memberError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile'
      });
    }
    console.log('✅ Member profile loaded');

    res.json({
      success: true,
      message: 'Login successful with enhanced auth',
      token: authData.session?.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: memberData?.name || authData.user.user_metadata?.name || 'Unknown',
        avatar_url: memberData?.avatar_url,
        memberships: [], // Simplified for now
        permissions: [] // TODO: Implement permission loading
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
});

// =============================================================================
// TYPESCRIPT CONTROLLER ENDPOINTS (JavaScript implementation)
// =============================================================================

// TypeScript Email Authentication Routes
app.post('/api/auth/email/signup', async (req, res) => {
  try {
    const { email, password, name, marketing_consent, analytics_consent } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password and name are required'
      });
    }

    console.log('🚀 TypeScript-style signup for:', email);

    // Use the same logic as the working signup but with TypeScript response format
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        auth_provider: 'email',
        email_verified: true,
        marketing_consent: marketing_consent || false,
        analytics_consent: analytics_consent || false
      }
    });

    if (authError) {
      console.error('❌ Auth creation failed:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    const groupId = uuidv4();
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        id: groupId,
        name: `${name}'s Household`,
        plan: 'Household',
        type: 'personal',
        status: 'active'
      })
      .select()
      .single();

    if (groupError) throw new Error(`Group creation failed: ${groupError.message}`);

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        name,
        status: 'active',
        marketing_consent: marketing_consent || false,
        analytics_consent: analytics_consent || false
      })
      .select()
      .single();

    if (memberError) throw new Error(`Member creation failed: ${memberError.message}`);

    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError || !adminRole) throw new Error('Admin role not found in database');

    const { data: membershipData, error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        member_id: authData.user.id,
        group_id: groupId,
        role_id: adminRole.id,
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (membershipError) throw new Error(`Membership creation failed: ${membershipError.message}`);

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: authData.user.email
    });

    const token = sessionData?.properties?.access_token || 'temp-token';

    // TypeScript-style response
    res.status(201).json({
      success: true,
      token: token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name,
        provider: 'email',
        current_group_id: groupId,
        is_admin: true,
        memberships: [{
          group_id: groupId,
          role: 'admin',
          status: 'active'
        }]
      },
      group: {
        id: groupId,
        name: `${name}'s Household`
      }
    });

  } catch (error) {
    console.error('❌ TypeScript signup error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create account'
    });
  }
});

app.post('/api/auth/email/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('🔐 TypeScript-style login for:', email);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('❌ Login failed:', authError);
      let errorMessage = 'Authentication failed';
      if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before logging in';
      } else if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      }
      return res.status(401).json({
        success: false,
        error: errorMessage
      });
    }

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (memberError) {
      console.error('❌ Member data fetch failed:', memberError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile'
      });
    }

    res.json({
      success: true,
      token: authData.session?.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: memberData?.name || authData.user.user_metadata?.name || 'Unknown',
        provider: 'email'
      }
    });

  } catch (error) {
    console.error('❌ TypeScript login error:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
});

// OAuth Authentication Routes
app.post('/api/auth/oauth/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { redirectTo, scopes } = req.body;
    
    const validProviders = ['google', 'github', 'facebook', 'apple', 'discord'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ 
        success: false,
        error: 'Unsupported authentication provider' 
      });
    }

    const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo
      }
    });

    if (error) {
      throw new Error(`OAuth ${provider} failed: ${error.message}`);
    }

    res.json({
      success: true,
      redirect_url: oauthData.url,
      provider: provider
    });

  } catch (error) {
    console.error(`OAuth ${req.params.provider} error:`, error);
    res.status(400).json({
      success: false,
      error: error.message || 'OAuth authentication failed'
    });
  }
});

app.post('/api/auth/oauth/callback', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(access_token);
    
    if (error || !user) {
      throw new Error('Invalid OAuth token');
    }

    // Check if member exists, create if not
    let { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', user.id)
      .single();

    if (memberError) {
      const { data: newMember, error: createError } = await supabase
        .from('members')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'OAuth User',
          auth_provider: user.app_metadata?.provider || 'oauth',
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create OAuth member: ${createError.message}`);
      }
      memberData = newMember;
    }

    res.json({
      success: true,
      token: access_token,
      refresh_token: refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: memberData.name,
        provider: user.app_metadata?.provider || 'oauth'
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'OAuth callback failed'
    });
  }
});

// Member Management Routes
app.get('/api/members/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Getting user for token:', token.substring(0, 20) + '...');
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Token validation failed:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('✅ Token valid for user:', user.id);

    // First try to get basic member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', user.id)
      .single();

    if (memberError) {
      console.error('❌ Member query failed:', memberError);
      
      // If member doesn't exist, create one from the auth user
      if (memberError.code === 'PGRST116') {
        console.log('🔧 Creating member record for authenticated user...');
        
        const { data: newMember, error: createError } = await supabase
          .from('members')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || 'User',
            status: 'active',
            auth_provider: 'email'
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Failed to create member:', createError);
          return res.status(500).json({ error: 'Failed to create user profile' });
        }

        console.log('✅ Member record created');
        
        // Return basic profile without memberships for now
        return res.json({
          ...newMember,
          memberships: []
        });
      }
      
      throw new Error(`Failed to get member: ${memberError.message}`);
    }

    console.log('✅ Member data found:', memberData.id);

    // Try to get memberships separately to avoid complex join issues
    const { data: memberships, error: membershipError } = await supabase
      .from('group_memberships')
      .select(`
        group_id,
        status,
        joined_at,
        groups (id, name),
        roles (name, display_name)
      `)
      .eq('member_id', user.id)
      .eq('status', 'active');

    if (membershipError) {
      console.warn('⚠️ Membership query failed:', membershipError);
      // Return basic profile without memberships
      return res.json({
        ...memberData,
        memberships: []
      });
    }

    console.log('✅ Found', memberships?.length || 0, 'memberships');

    res.json({
      ...memberData,
      memberships: memberships || []
    });

  } catch (error) {
    console.error('❌ Get me error:', error);
    res.status(500).json({ 
      error: 'Failed to get user profile',
      details: error.message 
    });
  }
});

app.get('/api/members/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('🔍 Getting members for group:', groupId);
    
    // First get the memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('group_memberships')
      .select('member_id, role_id, status, joined_at')
      .eq('group_id', groupId)
      .eq('status', 'active');

    if (membershipError) {
      console.error('❌ Membership query failed:', membershipError);
      throw new Error(`Failed to get memberships: ${membershipError.message}`);
    }

    console.log('✅ Found', memberships?.length || 0, 'memberships');

    if (!memberships || memberships.length === 0) {
      return res.json([]);
    }

    // Get member details for each membership
    const memberIds = memberships.map(m => m.member_id);
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, email, name, status')
      .in('id', memberIds);

    if (memberError) {
      console.error('❌ Members query failed:', memberError);
      throw new Error(`Failed to get members: ${memberError.message}`);
    }

    // Get role details
    const roleIds = memberships.map(m => m.role_id);
    const { data: roles, error: roleError } = await supabase
      .from('roles')
      .select('id, name, display_name')
      .in('id', roleIds);

    if (roleError) {
      console.error('❌ Roles query failed:', roleError);
      throw new Error(`Failed to get roles: ${roleError.message}`);
    }

    // Combine the data
    const result = memberships.map(membership => {
      const member = members?.find(m => m.id === membership.member_id);
      const role = roles?.find(r => r.id === membership.role_id);
      
      return {
        ...member,
        memberships: [{
          group_id: groupId,
          role_id: membership.role_id,
          status: membership.status,
          joined_at: membership.joined_at,
          role: {
            name: role?.name || 'unknown',
            display_name: role?.display_name || 'Unknown Role'
          }
        }]
      };
    });

    console.log('✅ Returning', result.length, 'group members');
    res.json(result);

  } catch (error) {
    console.error('❌ Get group members error:', error);
    res.status(500).json({ 
      error: 'Failed to get group members',
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Enhanced Auth API is running',
    timestamp: new Date().toISOString(),
    features: [
      'Multi-tenancy',
      'RBAC',
      'Group management',
      'Enhanced authentication',
      'TypeScript controllers',
      'OAuth support',
      'Member management'
    ]
  });
});

// Simple connectivity test for mobile
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Mobile connectivity test successful!',
    server: 'enhanced_server.js',
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']
  });
});


// Export the Express app for Vercel
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Enhanced Auth API Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📱 Mobile test: http://10.0.2.2:${PORT}/api/test`);
    console.log(`🔐 Signup: POST http://localhost:${PORT}/api/auth/signup`);
    console.log(`🔑 Login: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`🌐 Listening on all interfaces (0.0.0.0:${PORT})`);
  });
}