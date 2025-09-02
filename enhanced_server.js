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

    // Step 2: Use existing default group or create one
    let groupId = '29879397-7598-4a46-9378-cf64dd00ed26'; // Default group ID
    
    // Check if group exists, if not create it
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .single();

    if (!existingGroup) {
      // Create default group if it doesn't exist
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          id: groupId,
          name: 'Default Household',
          plan: 'Household',
          type: 'personal',
          status: 'active'
        })
        .select()
        .single();

      if (groupError) {
        console.error('❌ Group creation failed:', groupError);
        // Fall back to creating a new group with UUID
        groupId = uuidv4();
        const { data: newGroupData, error: newGroupError } = await supabase
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
        
        if (newGroupError) {
          throw new Error(`Group creation failed: ${newGroupError.message}`);
        }
      }
    }
    console.log('✅ Using group:', groupId);

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

    // Step 4: Get or create admin role
    let adminRoleId = null;
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.log('⚠️  Admin role not found, creating group membership without role');
      // Continue without role_id - this is acceptable
    } else {
      adminRoleId = adminRole.id;
      console.log('✅ Admin role found:', adminRole.id);
    }

    // Step 5: Create group membership
    const membershipData = {
      member_id: authData.user.id,
      group_id: groupId,
      status: 'active',
      joined_at: new Date().toISOString()
    };

    // Add role_id only if we found one
    if (adminRoleId) {
      membershipData.role_id = adminRoleId;
    }

    const { data: createdMembership, error: membershipError } = await supabase
      .from('group_memberships')
      .insert(membershipData)
      .select()
      .single();

    if (membershipError) {
      console.error('❌ Membership creation failed:', membershipError);
      throw new Error(`Membership creation failed: ${membershipError.message}`);
    }
    console.log('✅ Group membership created');

    // Step 6: Sign in the user to get a proper session token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: authData.user.email,
      password: password
    });

    if (signInError) {
      console.error('❌ Sign-in failed:', signInError);
      throw new Error(`Sign-in failed: ${signInError.message}`);
    }

    const token = signInData?.session?.access_token;

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

// Simple signup that works (fallback)
app.post('/api/auth/signup-simple', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('🚀 Simple signup for:', email);

    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || 'User',
        auth_provider: 'email'
      }
    });

    if (authError) {
      console.error('❌ Auth creation failed:', authError);
      return res.status(400).json({
        success: false,
        error: `Authentication failed: ${authError.message}`
      });
    }

    // Step 2: Create basic member record
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
      // Continue anyway - member record is optional for basic functionality
    }

    // Step 3: Add to default group if it exists
    const defaultGroupId = '29879397-7598-4a46-9378-cf64dd00ed26';
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        member_id: authData.user.id,
        group_id: defaultGroupId,
        status: 'active',
        joined_at: new Date().toISOString()
      });

    if (membershipError) {
      console.log('⚠️  Group membership creation failed (non-critical):', membershipError.message);
      // Continue - group membership is optional for basic functionality
    }

    // Generate a simple token (for testing)
    const token = `test-token-${authData.user.id}-${Date.now()}`;

    res.json({
      success: true,
      message: 'User created successfully',
      token: token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name || 'User',
        provider: 'email'
      }
    });

  } catch (error) {
    console.error('💥 Signup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during signup'
    });
  }
});

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Token verification failed'
    });
  }
};

// Simple profile endpoint
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Get member data if it exists
    const { data: memberData } = await supabase
      .from('members')
      .select('name, status')
      .eq('id', user.id)
      .single();

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: memberData?.name || user.user_metadata?.name || 'User',
        provider: user.app_metadata?.provider || 'email',
        status: memberData?.status || 'active'
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
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
      .from('member_groupships')
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

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: authData.user.email,
      password: password
    });

    if (signInError) {
      console.error('❌ Sign-in failed:', signInError);
      throw new Error(`Sign-in failed: ${signInError.message}`);
    }

    const token = signInData?.session?.access_token;

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
      .from('member_groupships')
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
      .from('member_groupships')
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
// ========================================
// TASK MANAGEMENT ENDPOINTS
// ========================================

// Create a new task
app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description, category, priority = 'medium', type = 'personal', due_date, assigned_member_id } = req.body;
    const user_id = req.user.id;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Get user's group membership (simplified)
    const { data: memberships, error: memberError } = await supabase
      .from('group_memberships')
      .select('group_id, status')
      .eq('member_id', user_id)
      .eq('status', 'active')
      .limit(1);

    console.log('🔍 Membership query result:', { memberships, memberError, user_id });

    if (!memberships || memberships.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to a group to create tasks',
        debug: { user_id, memberError, member: null }
      });
    }

    const userGroupId = memberships[0].group_id;

    const taskData = {
      id: uuidv4(),
      title,
      description,
      category,
      status: 'pending',
      priority,
      group_id: userGroupId,
      created_by: user_id,
      assignee_id: assigned_member_id || user_id, // Auto-assign to creator if no assignee specified
      due_date
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error('Task creation error:', error);
      throw error;
    }

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create task'
    });
  }
});

// Get tasks
app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { status, priority, type, assigned_member_id } = req.query;

    // Get user's groups (simplified)
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('group_id, status')
      .eq('member_id', user_id)
      .eq('status', 'active');

    if (!memberships || memberships.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No groups found'
      });
    }

    const groupIds = memberships.map(m => m.group_id);

    let query = supabase
      .from('tasks')
      .select('*')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (type) query = query.eq('type', type);
    if (assigned_member_id) query = query.eq('assigned_member_id', assigned_member_id);

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Get tasks error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: tasks || []
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch tasks'
    });
  }
});

// Get current user's assigned tasks
app.get('/api/tasks/my-tasks', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get my tasks error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: tasks || []
    });
  } catch (error) {
    console.error('My tasks fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user tasks'
    });
  }
});

// Get tasks for a specific group (simplified)
app.get('/api/tasks/group/:groupId', verifyToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const user_id = req.user.id;
    
    console.log(`Fetching tasks for group: ${groupId}, user: ${user_id}`);
    
    // Simple query without complex joins to avoid relationship issues
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get group tasks error:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to fetch group tasks' 
      });
    }

    res.json({
      success: true,
      data: tasks || [],
      count: tasks ? tasks.length : 0
    });
  } catch (error) {
    console.error('Get group tasks error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to fetch group tasks' 
    });
  }
});

// Update a task
app.put('/api/tasks/:taskId', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const user_id = req.user.id;
    const { title, description, status, priority, type, due_date, assigned_member_id } = req.body;

    // Check if task exists and user has permission
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*, group_id')
      .eq('id', taskId)
      .single();

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Verify user has access to this group
    const { data: member } = await supabase
      .from('members')
      .select(`
        id,
        group_memberships!group_memberships_member_id_fkey (
          group_id,
          status
        )
      `)
      .eq('id', user_id)
      .single();

    const membership = member?.group_memberships?.find(m => 
      m.group_id === existingTask.group_id && m.status === 'active'
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (type !== undefined) updateData.type = type;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (assigned_member_id !== undefined) updateData.assigned_member_id = assigned_member_id;

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Task update error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update task'
    });
  }
});

// Update a task (PATCH method)
app.patch('/api/tasks/:taskId', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const user_id = req.user.id;
    
    console.log(`Updating task ${taskId} for user ${user_id}`);
    console.log('Update data:', req.body);

    // Simple update without complex permission checks for now
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Update task error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update task'
      });
    }

    res.json({
      success: true,
      data: task,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update task'
    });
  }
});

// Complete a task (shortcut)
app.patch('/api/tasks/:taskId/complete', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const user_id = req.user.id;

    // Check if task exists and user has permission
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*, group_id')
      .eq('id', taskId)
      .single();

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Verify user has access to this group
    const { data: member } = await supabase
      .from('members')
      .select(`
        id,
        group_memberships!group_memberships_member_id_fkey (
          group_id,
          status
        )
      `)
      .eq('id', user_id)
      .single();

    const membership = member?.group_memberships?.find(m => 
      m.group_id === existingTask.group_id && m.status === 'active'
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Task completion error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: task,
      message: 'Task completed successfully'
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete task'
    });
  }
});

// Delete a task
app.delete('/api/tasks/:taskId', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const user_id = req.user.id;

    // Check if task exists and user has permission
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*, group_id')
      .eq('id', taskId)
      .single();

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Verify user has access to this group
    const { data: member } = await supabase
      .from('members')
      .select(`
        id,
        group_memberships!group_memberships_member_id_fkey (
          group_id,
          status
        )
      `)
      .eq('id', user_id)
      .single();

    const membership = member?.group_memberships?.find(m => 
      m.group_id === existingTask.group_id && m.status === 'active'
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Task deletion error:', error);
      throw error;
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete task'
    });
  }
});

// Toggle a task completion status
app.patch('/api/tasks/:taskId/toggle', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const user_id = req.user.id;

    console.log(`Toggling task ${taskId} for user ${user_id}`);

    // Get the current task to check its status
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*, group_id')
      .eq('id', taskId)
      .single();

    if (fetchError || !existingTask) {
      console.error('Task not found:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Toggle the completion status
    const newStatus = existingTask.status === 'completed' ? 'pending' : 'completed';
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // Set completed_at if completing the task
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Task toggle error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to toggle task'
      });
    }

    console.log(`Task ${taskId} toggled to ${newStatus}`);

    res.json({
      success: true,
      data: task,
      message: `Task ${newStatus === 'completed' ? 'completed' : 'reopened'} successfully`
    });
  } catch (error) {
    console.error('Toggle task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle task'
    });
  }
});

// Get task statistics
app.get('/api/tasks/stats', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { group_id } = req.query;
    
    console.log(`Getting task statistics for user: ${user_id}, group: ${group_id}`);
    
    // Get user's groups if no specific group provided
    let groupIds = [];
    if (group_id) {
      groupIds = [group_id];
    } else {
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('member_id', user_id)
        .eq('status', 'active');
      groupIds = memberships?.map(m => m.group_id) || [];
    }
    
    if (groupIds.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0, completed: 0, pending: 0, in_progress: 0,
          urgent: 0, today: 0, overdue: 0, completion_rate: 0
        }
      });
    }
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('status, due_date, priority')
      .in('group_id', groupIds);
      
    if (error) {
      console.error('Task stats query error:', error);
      throw error;
    }
    
    const total = tasks?.length || 0;
    const completed = tasks?.filter(t => t.status === 'completed').length || 0;
    const pending = tasks?.filter(t => t.status === 'pending').length || 0;
    const in_progress = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const urgent = tasks?.filter(t => 
      (t.priority === 'High' || t.priority === 'high') && t.status !== 'completed'
    ).length || 0;
    
    const today = new Date().toDateString();
    const todayCount = tasks?.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      return new Date(t.due_date).toDateString() === today;
    }).length || 0;
    
    const now = new Date();
    const overdue = tasks?.filter(t => 
      t.status !== 'completed' && t.due_date && new Date(t.due_date) < now
    ).length || 0;
    
    const completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`Task statistics calculated:`, {
      total, completed, pending, in_progress, urgent, today: todayCount, overdue, completion_rate
    });
    
    res.json({
      success: true,
      data: {
        total, completed, pending, in_progress,
        urgent, today: todayCount, overdue, completion_rate
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch task statistics'
    });
  }
});

// Get task categories
app.get('/api/tasks/categories', async (req, res) => {
  try {
    const { mode } = req.query;
    
    // Define categories based on mode
    const householdCategories = [
      'Chores', 'Kids', 'Personal', 'Home', 'Family', 'Maintenance', 'Shopping', 'Garden', 'Pets'
    ];
    
    const workCategories = [
      'Work', 'Business', 'Meetings', 'Projects', 'Professional', 'Development', 'Admin', 'Client Work'
    ];
    
    let categories;
    if (mode === 'household') {
      categories = householdCategories;
    } else if (mode === 'work') {
      categories = workCategories;
    } else {
      // Return all categories if no mode specified
      categories = [...new Set([...householdCategories, ...workCategories])];
    }
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get categories'
    });
  }
});


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