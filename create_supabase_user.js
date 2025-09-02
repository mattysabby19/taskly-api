// Create user through Supabase Auth properly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createSupabaseUser() {
  console.log('🔐 Creating User via Supabase Auth');
  console.log('==================================\n');

  const testEmail = `authtest${Date.now()}@example.com`;
  const testPassword = 'Test123456';
  
  try {
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}`);

    // Step 1: Create user through Supabase Auth
    console.log('\n1️⃣ Creating user via Supabase Auth...');
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm to skip email verification
      user_metadata: {
        name: 'Auth Test User'
      }
    });

    if (authError) {
      throw new Error(`Supabase Auth creation failed: ${authError.message}`);
    }

    console.log('✅ Supabase Auth user created:', authData.user.id);

    // Step 2: Create corresponding group
    console.log('\n2️⃣ Creating group...');
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: `${authData.user.user_metadata.name}'s Household`,
        description: 'Auto-created household group',
        type: 'personal',
        status: 'active'
      })
      .select()
      .single();
    
    if (groupError) {
      console.log('❌ Group creation failed:', groupError.message);
    } else {
      console.log('✅ Group created:', newGroup.id);
    }

    // Step 3: Create member record
    console.log('\n3️⃣ Creating member record...');
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        id: authData.user.id, // Use same ID as Supabase Auth user
        email: testEmail,
        name: authData.user.user_metadata.name,
        auth_provider: 'email',
        email_verified: true,
        status: 'active',
        preferences: newGroup ? { group_id: newGroup.id } : {}
      })
      .select()
      .single();
    
    if (memberError) {
      console.log('❌ Member creation failed:', memberError.message);
    } else {
      console.log('✅ Member record created:', newMember.id);
    }

    console.log('\n🎯 Complete User Setup Successful!');
    console.log('==================================');
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}`);
    console.log(`🆔 Auth ID: ${authData.user.id}`);
    console.log(`👥 Group ID: ${newGroup?.id || 'None'}`);
    
    // Step 4: Test login immediately
    console.log('\n4️⃣ Testing login...');
    
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    const loginResult = await loginResponse.json();
    console.log(`Login Status: ${loginResponse.status}`);
    
    if (loginResult.success) {
      console.log('✅ LOGIN TEST SUCCESSFUL!');
      console.log(`🎫 Token: ${loginResult.token.substring(0, 50)}...`);
      
      return {
        email: testEmail,
        password: testPassword,
        token: loginResult.token,
        userId: authData.user.id,
        groupId: newGroup?.id
      };
    } else {
      console.log('❌ Login test failed:', loginResult.error);
      console.log('Full response:', loginResult);
      return null;
    }

  } catch (error) {
    console.error('❌ User creation failed:', error.message);
    return null;
  }
}

// Run directly or export
if (require.main === module) {
  createSupabaseUser().then(result => {
    if (result) {
      console.log('\n🚀 Ready for E2E testing with these credentials!');
    }
  });
} else {
  module.exports = createSupabaseUser;
}