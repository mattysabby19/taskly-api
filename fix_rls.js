// Fix RLS policies for task creation
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixRLS() {
  console.log('🔐 Fixing RLS Policies for Task Creation');
  console.log('======================================\n');

  try {
    console.log('1️⃣ Checking current RLS status...');
    
    // First, let's try to create a task directly as service user
    const testTask = {
      title: 'RLS Test Task',
      description: 'Testing RLS permissions',
      category: 'Chores',
      priority: 'Medium',
      group_id: '29879397-7598-4a46-9378-cf64dd00ed26',
      created_by: '65710f59-e2ce-4c0f-ac28-028750c2f8d2',
      status: 'pending',
      urgent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Testing direct task creation as service user...');
    const { data: directTask, error: directError } = await supabase
      .from('tasks')
      .insert(testTask)
      .select()
      .single();

    if (directError) {
      console.log('❌ Direct task creation failed:', directError.message);
      
      if (directError.message.includes('row-level security')) {
        console.log('\n🔧 RLS is blocking task creation. Options:');
        console.log('1. Temporarily disable RLS for testing');
        console.log('2. Create proper RLS policies');
        
        // Let's check if we can disable RLS temporarily
        console.log('\nAttempting to check RLS status...');
        
        // Try to query task policies
        try {
          const { data: policies } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'tasks');
          
          console.log('Found task policies:', policies?.length || 0);
        } catch (err) {
          console.log('Cannot query policies:', err.message);
        }
      }
    } else {
      console.log('✅ Direct task creation successful:', directTask.id);
    }

    // Let's try to run SQL that might help
    console.log('\n2️⃣ Checking if we can manage RLS settings...');
    
    // Since we might not be able to run DDL, let's try a different approach
    // Let's see if the issue is with the user context
    
    // Test with the actual user token
    console.log('\n3️⃣ Testing with actual user authentication...');
    
    // Get fresh login token
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'authtest1753561906486@example.com',
        password: 'Test123456'
      })
    });

    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      
      if (loginResult.success) {
        console.log('✅ Got fresh auth token');
        
        // Create Supabase client with user token
        const userSupabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY, // Use anon key with user token
          {
            global: {
              headers: {
                Authorization: `Bearer ${loginResult.token}`
              }
            }
          }
        );

        // Try task creation with user context
        const { data: userTask, error: userError } = await userSupabase
          .from('tasks')
          .insert({
            title: 'User Context Test Task',
            description: 'Testing with user authentication context',
            category: 'Chores',
            priority: 'Medium',
            group_id: '29879397-7598-4a46-9378-cf64dd00ed26',
            urgent: false
          })
          .select()
          .single();

        if (userError) {
          console.log('❌ User context task creation failed:', userError.message);
          
          // The issue might be that our API is using service key but RLS expects user context
          console.log('\n🔍 Diagnosis: API might need to use user tokens, not service key');
          
        } else {
          console.log('✅ User context task creation successful!', userTask.id);
        }

        // Test the API endpoint directly with proper auth
        console.log('\n4️⃣ Testing API endpoint with user token...');
        
        const apiResponse = await fetch('http://localhost:4000/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginResult.token}`
          },
          body: JSON.stringify({
            title: 'API Endpoint Test Task',
            description: 'Testing API endpoint with proper auth',
            category: 'Work',
            priority: 'High',
            urgent: true
          })
        });

        const apiResult = await apiResponse.json();
        console.log(`API Status: ${apiResponse.status}`);
        console.log('API Response:', JSON.stringify(apiResult, null, 2));

        if (apiResult.success) {
          console.log('🎉 API TASK CREATION SUCCESSFUL!');
          
          return {
            email: 'authtest1753561906486@example.com',
            password: 'Test123456',
            token: loginResult.token,
            groupId: '29879397-7598-4a46-9378-cf64dd00ed26',
            userId: '65710f59-e2ce-4c0f-ac28-028750c2f8d2',
            taskId: apiResult.data.id
          };
        } else {
          console.log('❌ API task creation failed:', apiResult.error);
        }
      }
    }

  } catch (error) {
    console.error('❌ RLS fix failed:', error.message);
  }

  console.log('\n✅ RLS fix attempt complete!');
}

fixRLS().then(result => {
  if (result) {
    console.log('\n🎯 SUCCESS! Ready for complete E2E test');
    console.log('=======================================');
    console.log('Working credentials:', {
      email: result.email,
      groupId: result.groupId,
      taskCreated: result.taskId
    });
  }
});