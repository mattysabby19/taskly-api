// Check actual database schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking Database Schema');
  console.log('==========================\n');

  try {
    // Check what columns exist in tasks table
    console.log('1️⃣ Checking tasks table columns...');
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'tasks')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.log('❌ Cannot query columns:', columnsError.message);
    } else if (columns) {
      console.log('✅ Tasks table columns:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Check if tasks table has any data
    console.log('\n2️⃣ Checking tasks table structure...');
    
    const { data: sampleTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);

    if (tasksError) {
      console.log('❌ Cannot query tasks:', tasksError.message);
    } else {
      console.log(`✅ Tasks table accessible, ${sampleTasks?.length || 0} records found`);
      if (sampleTasks && sampleTasks.length > 0) {
        console.log('Sample task structure:', Object.keys(sampleTasks[0]));
      }
    }

    // Check if the database setup script needs to be run
    console.log('\n3️⃣ Checking if database needs setup...');
    
    // Try to run a minimal insert to see what's actually missing
    const minimalTask = {
      title: 'Schema Check Task',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: testInsert, error: insertError } = await supabase
      .from('tasks')
      .insert(minimalTask)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Minimal insert failed:', insertError.message);
      
      if (insertError.message.includes('category')) {
        console.log('\n🚨 DIAGNOSIS: tasks table is missing required columns!');
        console.log('💡 SOLUTION: Run the database setup script');
        console.log('\n📋 Required columns that appear to be missing:');
        console.log('   - category');
        console.log('   - priority'); 
        console.log('   - group_id');
        console.log('   - created_by');
        console.log('   - assigned_to');
        console.log('   - due_date');
        console.log('   - urgent');
        console.log('   - estimated_minutes');
        console.log('   - completed_at');
        console.log('   - description');
      }
    } else {
      console.log('✅ Minimal insert successful:', testInsert.id);
    }

    // Check RLS status
    console.log('\n4️⃣ Checking RLS policies...');
    
    try {
      const { data: policies } = await supabase
        .from('pg_policies')
        .select('policyname, cmd, qual')
        .eq('tablename', 'tasks');
      
      if (policies && policies.length > 0) {
        console.log('✅ Found RLS policies:');
        policies.forEach(policy => {
          console.log(`   - ${policy.policyname}: ${policy.cmd}`);
        });
      } else {
        console.log('⚠️  No RLS policies found for tasks table');
      }
    } catch (err) {
      console.log('❌ Cannot check policies:', err.message);
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }

  console.log('\n✅ Schema check complete!');
}

checkSchema();