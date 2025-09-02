// End-to-end test: Signup -> Login -> Create Task (No Mocks)
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';
const timestamp = Date.now();
const testEmail = `e2etest${timestamp}@example.com`;
const testPassword = 'Test123456';

async function runE2ETest() {
  console.log('🧪 Starting End-to-End Test (No Mocks)');
  console.log('======================================\n');

  let authToken = null;
  let userProfile = null;
  let createdTaskId = null;

  try {
    // Step 1: Create a new user
    console.log('1️⃣ Creating new user...');
    console.log(`Email: ${testEmail}`);
    
    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'E2E Test User'
      })
    });

    const signupResult = await signupResponse.json();
    console.log(`Signup Status: ${signupResponse.status}`);
    console.log('Signup Response:', JSON.stringify(signupResult, null, 2));

    if (!signupResult.success) {
      throw new Error(`Signup failed: ${signupResult.error}`);
    }

    console.log('✅ User created successfully!\n');

    // Step 2: Login with the new user
    console.log('2️⃣ Logging in...');
    
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    const loginResult = await loginResponse.json();
    console.log(`Login Status: ${loginResponse.status}`);
    console.log('Login Response:', JSON.stringify(loginResult, null, 2));

    if (!loginResult.success || !loginResult.token) {
      throw new Error(`Login failed: ${loginResult.error}`);
    }

    authToken = loginResult.token;
    console.log('✅ Login successful!\n');

    // Step 3: Get user profile to verify group membership
    console.log('3️⃣ Getting user profile...');
    
    const profileResponse = await fetch(`${API_BASE}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const profileResult = await profileResponse.json();
    console.log(`Profile Status: ${profileResponse.status}`);
    console.log('Profile Response:', JSON.stringify(profileResult, null, 2));

    if (!profileResult.success) {
      throw new Error(`Profile fetch failed: ${profileResult.error}`);
    }

    userProfile = profileResult.user;
    console.log('✅ Profile retrieved successfully!\n');

    // Step 4: Create a task (snake_case fields)
    console.log('4️⃣ Creating task with snake_case fields...');
    
    const taskData1 = {
      title: 'E2E Test Task (snake_case)',
      description: 'Created via end-to-end test',
      category: 'Chores',
      priority: 'Medium',
      group_id: userProfile.group_id || userProfile.clientid,
      urgent: false
    };

    console.log('Task Data:', JSON.stringify(taskData1, null, 2));

    const createResponse1 = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(taskData1)
    });

    const createResult1 = await createResponse1.json();
    console.log(`Create Task Status: ${createResponse1.status}`);
    console.log('Create Task Response:', JSON.stringify(createResult1, null, 2));

    if (createResult1.success && createResult1.data) {
      createdTaskId = createResult1.data.id;
      console.log('✅ Task created successfully!\n');
    } else {
      console.log('❌ Task creation failed, but continuing...\n');
    }

    // Step 5: Create a task (camelCase fields)
    console.log('5️⃣ Creating task with camelCase fields...');
    
    const taskData2 = {
      title: 'E2E Test Task (camelCase)',
      description: 'Testing field transformation',
      category: 'Work',
      priority: 'high', // lowercase
      groupId: userProfile.group_id || userProfile.clientid, // camelCase
      assignedTo: userProfile.id, // camelCase
      dueDate: '2024-12-31T23:59:59.000Z', // camelCase
      urgent: true
    };

    console.log('Task Data:', JSON.stringify(taskData2, null, 2));

    const createResponse2 = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(taskData2)
    });

    const createResult2 = await createResponse2.json();
    console.log(`Create Task Status: ${createResponse2.status}`);
    console.log('Create Task Response:', JSON.stringify(createResult2, null, 2));

    if (createResult2.success) {
      console.log('✅ CamelCase task created successfully!\n');
    } else {
      console.log('❌ CamelCase task creation failed, but continuing...\n');
    }

    // Step 6: Get tasks for the user's group
    console.log('6️⃣ Retrieving tasks for group...');
    
    const groupId = userProfile.group_id || userProfile.clientid;
    const getResponse = await fetch(`${API_BASE}/tasks/group/${groupId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const getResult = await getResponse.json();
    console.log(`Get Tasks Status: ${getResponse.status}`);
    console.log('Get Tasks Response:', JSON.stringify(getResult, null, 2));

    if (getResult.success) {
      console.log(`✅ Retrieved ${getResult.data?.length || 0} tasks successfully!\n`);
    } else {
      console.log('❌ Task retrieval failed, but continuing...\n');
    }

    // Step 7: Update a task (if we have one)
    if (createdTaskId) {
      console.log('7️⃣ Updating task...');
      
      const updateResponse = await fetch(`${API_BASE}/tasks/${createdTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Updated E2E Test Task',
          priority: 'High',
          status: 'in_progress'
        })
      });

      const updateResult = await updateResponse.json();
      console.log(`Update Task Status: ${updateResponse.status}`);
      console.log('Update Task Response:', JSON.stringify(updateResult, null, 2));

      if (updateResult.success) {
        console.log('✅ Task updated successfully!\n');
      }
    }

    console.log('🎉 End-to-End Test Complete!');
    console.log('=============================');
    console.log(`✅ User: ${testEmail}`);
    console.log(`✅ Token: ${authToken ? 'Valid' : 'None'}`);
    console.log(`✅ Group ID: ${userProfile?.group_id || userProfile?.clientid || 'None'}`);
    console.log(`✅ Tasks Created: ${createdTaskId ? 'Yes' : 'Failed'}`);

  } catch (error) {
    console.error('❌ E2E Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

runE2ETest();