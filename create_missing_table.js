// Create the missing group_memberships table and fix signup process
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createMissingTable() {
  console.log('🔧 Creating Missing group_memberships Table');
  console.log('==========================================\n');

  try {
    // First, let's see what tables exist
    console.log('1️⃣ Checking existing tables...');
    
    const { data: existingTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%group%');
    
    if (existingTables) {
      console.log('Existing group-related tables:', existingTables.map(t => t.table_name));
    }

    // Try to create group_memberships table via direct insert
    console.log('\n2️⃣ Creating group_memberships table...');
    
    // Since we can't run DDL directly, let's try a different approach
    // First, let's see if we can query the table to see if it exists
    try {
      const { error: testError } = await supabase
        .from('group_memberships')
        .select('*')
        .limit(1);
      
      if (testError && testError.message.includes('does not exist')) {
        console.log('❌ Table group_memberships does not exist');
        console.log('📝 Table needs to be created manually in Supabase dashboard');
        
        console.log('\n🛠️  SQL to run in Supabase SQL Editor:');
        console.log('=====================================');
        console.log(`
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    joined_at TIMESTAMP DEFAULT NOW(),
    invited_by UUID REFERENCES members(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(group_id, member_id)
);
        `);
      } else {
        console.log('✅ Table group_memberships already exists');
      }
    } catch (err) {
      console.log('❌ Error checking table:', err.message);
    }

    // For now, let's manually link our test user to their group
    console.log('\n3️⃣ Manually linking test user to group...');
    
    // Get the latest test user and group
    const { data: members } = await supabase
      .from('members')
      .select('id, email, preferences')
      .order('created_at', { ascending: false })
      .limit(3);
    
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(3);
    
    console.log('Recent members:', members?.map(m => ({ id: m.id, email: m.email })));
    console.log('Recent groups:', groups?.map(g => ({ id: g.id, name: g.name })));

    if (members && groups && members.length > 0 && groups.length > 0) {
      // Try to link the most recent member to their group
      const member = members[0];
      const group = groups[0];
      
      // Check if we have group_memberships table working
      try {
        const { data: membership, error: membershipError } = await supabase
          .from('group_memberships')
          .insert({
            group_id: group.id,
            member_id: member.id,
            status: 'active'
          })
          .select()
          .single();
        
        if (membershipError) {
          console.log('❌ Membership creation failed:', membershipError.message);
        } else {
          console.log(`✅ Linked ${member.email} to ${group.name}`);
        }
      } catch (err) {
        console.log('❌ Table still not accessible:', err.message);
      }
    }

  } catch (error) {
    console.error('❌ Process failed:', error.message);
  }

  console.log('\n✅ Table creation check complete!');
}

createMissingTable();