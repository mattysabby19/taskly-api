// Fix missing group_members table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixDatabase() {
  console.log('🔧 Fixing Database Schema');
  console.log('=========================\n');

  try {
    // Create group_members table
    console.log('1️⃣ Creating group_members table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS group_members (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
        permissions JSONB DEFAULT '{}',
        joined_at TIMESTAMP DEFAULT NOW(),
        invited_by UUID REFERENCES members(id),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(group_id, member_id)
      );
    `;

    const { error: createError } = await supabase.rpc('sql', { query: createTableSQL });
    
    if (createError) {
      console.log('❌ Create table failed:', createError.message);
    } else {
      console.log('✅ group_members table created successfully!');
    }

    // Now try to link existing members to groups
    console.log('\n2️⃣ Linking existing members to their groups...');
    
    // Get all members and groups
    const { data: members } = await supabase.from('members').select('id, email');
    const { data: groups } = await supabase.from('groups').select('id, name');
    
    if (members && groups && members.length > 0 && groups.length > 0) {
      // For simplicity, link each member to the first group as admin for testing
      for (let i = 0; i < Math.min(members.length, groups.length); i++) {
        const member = members[i];
        const group = groups[i];
        
        const { error: linkError } = await supabase
          .from('group_members')
          .insert({
            group_id: group.id,
            member_id: member.id,
            role: 'admin'
          });
        
        if (linkError && !linkError.message.includes('duplicate')) {
          console.log(`❌ Failed to link ${member.email}: ${linkError.message}`);
        } else {
          console.log(`✅ Linked ${member.email} to ${group.name}`);
        }
      }
    }

    console.log('\n3️⃣ Creating a test user with proper setup...');
    
    const testEmail = `fulltest${Date.now()}@example.com`;
    
    // Create group first
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'Full Test Group',
        description: 'Complete test setup',
        type: 'personal'
      })
      .select()
      .single();
    
    if (groupError) {
      console.log('❌ Group creation failed:', groupError.message);
    } else {
      console.log(`✅ Test group created: ${newGroup.id}`);
      
      // Create member
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert({
          email: testEmail,
          name: 'Full Test User',
          auth_provider: 'email',
          email_verified: true,
          password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // bcrypt hash for 'password'
        })
        .select()
        .single();
      
      if (memberError) {
        console.log('❌ Member creation failed:', memberError.message);
      } else {
        console.log(`✅ Test member created: ${newMember.id}`);
        
        // Link member to group
        const { error: linkError } = await supabase
          .from('group_members')
          .insert({
            group_id: newGroup.id,
            member_id: newMember.id,
            role: 'admin'
          });
        
        if (linkError) {
          console.log('❌ Group linking failed:', linkError.message);
        } else {
          console.log('✅ Test user fully set up!');
          console.log(`\n🎯 Test Login Credentials:`);
          console.log(`   Email: ${testEmail}`);
          console.log(`   Password: password`);
          console.log(`   Group ID: ${newGroup.id}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Database fix failed:', error);
  }

  console.log('\n✅ Database fix complete!');
}

fixDatabase();