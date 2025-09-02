// Create a complete test user setup
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestUser() {
  console.log('👤 Creating Complete Test User Setup');
  console.log('===================================\n');

  const testEmail = `apitest${Date.now()}@example.com`;
  const testPassword = 'password123';
  
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(testPassword, 10);
    console.log('✅ Password hashed');

    // Create group first
    console.log('1️⃣ Creating test group...');
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'API Test Group',
        description: 'Group for API testing',
        type: 'personal',
        status: 'active'
      })
      .select()
      .single();
    
    if (groupError) {
      throw new Error(`Group creation failed: ${groupError.message}`);
    }
    
    console.log(`✅ Group created: ${newGroup.id}`);

    // Create member
    console.log('2️⃣ Creating test member...');
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        email: testEmail,
        name: 'API Test User',
        auth_provider: 'email',
        email_verified: true,
        password_hash: passwordHash,
        status: 'active'
      })
      .select()
      .single();
    
    if (memberError) {
      throw new Error(`Member creation failed: ${memberError.message}`);
    }
    
    console.log(`✅ Member created: ${newMember.id}`);

    // Check if group_members table exists and try to use it
    console.log('3️⃣ Setting up group membership...');
    
    // For now, we'll update the member record to include the group_id
    // since the signup process expects this
    const { error: updateError } = await supabase
      .from('members')
      .update({ 
        // We'll use the preferences field to store group_id temporarily
        preferences: { group_id: newGroup.id }
      })
      .eq('id', newMember.id);
    
    if (updateError) {
      console.log('❌ Group association warning:', updateError.message);
    } else {
      console.log('✅ Group association created');
    }

    console.log('\n🎯 Test User Created Successfully!');
    console.log('================================');
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}`);
    console.log(`👥 Group ID: ${newGroup.id}`);
    console.log(`👤 User ID: ${newMember.id}`);
    
    // Test the login immediately
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
      console.log('✅ Login test SUCCESSFUL!');
      console.log(`🎫 Token: ${loginResult.token}`);
      
      // Return the credentials for the main test
      return {
        email: testEmail,
        password: testPassword,
        token: loginResult.token,
        groupId: newGroup.id,
        userId: newMember.id
      };
    } else {
      console.log('❌ Login test failed:', loginResult.error);
      return null;
    }

  } catch (error) {
    console.error('❌ Test user creation failed:', error.message);
    return null;
  }
}

// Export for use in other scripts or run directly
if (require.main === module) {
  createTestUser();
} else {
  module.exports = createTestUser;
}