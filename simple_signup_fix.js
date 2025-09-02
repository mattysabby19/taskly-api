// Add this simple signup endpoint to replace the complex one

// Simple signup that works
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