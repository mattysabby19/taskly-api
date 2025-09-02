// Fix group membership with proper role assignment
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixMembership() {
  console.log('🔧 Fixing Group Membership');
  console.log('==========================\n');

  try {
    // Get available roles
    console.log('1️⃣ Getting available roles...');
    const { data: roles } = await supabase
      .from('roles')
      .select('id, name, display_name');
    
    console.log('Available roles:', roles);

    // Get the admin role
    const adminRole = roles?.find(r => r.name === 'admin');
    if (!adminRole) {
      console.log('❌ No admin role found');
      return;
    }
    
    console.log(`✅ Using admin role: ${adminRole.id}`);

    // Get the most recent test user and group
    const { data: members } = await supabase
      .from('members')
      .select('id, email')
      .order('created_at', { ascending: false })
      .limit(1);
    
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!members?.[0] || !groups?.[0]) {
      console.log('❌ No members or groups found');
      return;
    }

    const member = members[0];
    const group = groups[0];
    
    console.log(`\n2️⃣ Linking ${member.email} to ${group.name}...`);

    // Check if membership already exists
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('member_id', member.id)
      .eq('group_id', group.id)
      .single();
    
    if (existingMembership) {
      console.log('✅ Membership already exists:', existingMembership.id);
    } else {
      // Create the membership
      const { data: newMembership, error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: group.id,
          member_id: member.id,
          role_id: adminRole.id,
          status: 'active'
        })
        .select()
        .single();
      
      if (membershipError) {
        console.log('❌ Membership creation failed:', membershipError.message);
      } else {
        console.log('✅ Membership created successfully:', newMembership.id);
      }
    }

    console.log('\n3️⃣ Testing login and task creation...');
    
    // Test login with this user
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: member.email,
        password: 'Test123456' // Standard test password
      })
    });

    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      if (loginResult.success) {
        console.log(`✅ Login successful! Token: ${loginResult.token.substring(0, 30)}...`);
        
        // Test task creation
        const taskResponse = await fetch('http://localhost:4000/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginResult.token}`
          },
          body: JSON.stringify({
            title: 'Membership Fix Test Task',
            description: 'Testing after fixing group membership',
            category: 'Chores',
            priority: 'Medium',
            group_id: group.id,
            urgent: false
          })
        });

        const taskResult = await taskResponse.json();
        console.log(`Task creation status: ${taskResponse.status}`);
        
        if (taskResult.success) {
          console.log('🎉 TASK CREATION SUCCESSFUL!');
          console.log('Task created:', taskResult.data.id);
          
          return {
            email: member.email,
            password: 'Test123456',
            token: loginResult.token,
            groupId: group.id,
            userId: member.id,
            taskId: taskResult.data.id
          };
        } else {
          console.log('❌ Task creation failed:', taskResult.error);
        }
      } else {
        console.log('❌ Login failed:', loginResult.error);
      }
    } else {
      console.log('❌ Login request failed:', loginResponse.status);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }

  console.log('\n✅ Membership fix complete!');
}

fixMembership().then(result => {
  if (result) {
    console.log('\n🚀 READY FOR COMPLETE E2E TEST!');
    console.log('===============================');
    console.log('Credentials:', result);
  }
});