// Check database status and existing tables
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabase() {
  console.log('🔍 Checking Database Status');
  console.log('==========================\n');

  try {
    // Check if core tables exist
    console.log('1️⃣ Checking if core tables exist...');

    // Try to query each table
    const tables = ['members', 'groups', 'group_members', 'tasks', 'roles'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`);
        } else {
          console.log(`✅ Table '${table}': EXISTS (${data?.length || 0} sample records)`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`);
      }
    }

    console.log('\n2️⃣ Checking existing users...');
    
    // Check for existing members
    try {
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, email, name, auth_provider')
        .limit(5);
      
      if (membersError) {
        console.log('❌ Cannot query members:', membersError.message);
      } else {
        console.log(`✅ Found ${members?.length || 0} existing members:`);
        if (members && members.length > 0) {
          members.forEach(member => {
            console.log(`   - ${member.email} (${member.name}) [${member.auth_provider}]`);
          });
        }
      }
    } catch (err) {
      console.log('❌ Members query failed:', err.message);
    }

    console.log('\n3️⃣ Checking existing groups...');
    
    // Check for existing groups
    try {
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, type, status')
        .limit(5);
      
      if (groupsError) {
        console.log('❌ Cannot query groups:', groupsError.message);
      } else {
        console.log(`✅ Found ${groups?.length || 0} existing groups:`);
        if (groups && groups.length > 0) {
          groups.forEach(group => {
            console.log(`   - ${group.name} (${group.type}) [${group.status}]`);
          });
        }
      }
    } catch (err) {
      console.log('❌ Groups query failed:', err.message);
    }

    console.log('\n4️⃣ Testing simple insert...');
    
    // Try to create a test group first
    try {
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: 'Test Group E2E',
          description: 'Group created for E2E testing',
          type: 'personal'
        })
        .select()
        .single();
      
      if (groupError) {
        console.log('❌ Cannot create test group:', groupError.message);
      } else {
        console.log('✅ Test group created:', newGroup.id);
        
        // Now try to create a member
        const { data: newMember, error: memberError } = await supabase
          .from('members')
          .insert({
            email: `dbtest${Date.now()}@example.com`,
            name: 'DB Test User',
            auth_provider: 'email',
            email_verified: true,
            password_hash: 'dummy_hash_for_testing'
          })
          .select()
          .single();
        
        if (memberError) {
          console.log('❌ Cannot create test member:', memberError.message);
        } else {
          console.log('✅ Test member created:', newMember.id);
          
          // Try to link member to group
          const { data: membership, error: membershipError } = await supabase
            .from('group_members')
            .insert({
              group_id: newGroup.id,
              member_id: newMember.id,
              role: 'admin'
            })
            .select()
            .single();
          
          if (membershipError) {
            console.log('❌ Cannot create group membership:', membershipError.message);
          } else {
            console.log('✅ Group membership created successfully!');
          }
        }
      }
    } catch (err) {
      console.log('❌ Insert test failed:', err.message);
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }

  console.log('\n✅ Database check complete!');
}

checkDatabase();