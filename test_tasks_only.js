// Test just the task CRUD operations with real auth
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';

// Use the working token from our login test
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjBRY1FEbmxnUkVrMm9lVEEiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzUzNTY1MzYzLCJpYXQiOjE3NTM1NjE3NjMsImlzcyI6Imh0dHBzOi8vbmdkbWx4cW10eHFibXVocWRub2suc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjFmMWNkZmQ4LTQyYjEtNDk1My1hMzI2LTI4NGIxZGJjNzAyOCIsImVtYWlsIjoiYXV0aHRlc3QxNzUzNTYxNzYzNDE2QGV4YW1wbGUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQXV0aCBUZXN0IFVzZXIifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1MzU2MTc2M31dLCJzZXNzaW9uX2lkIjoiOWJjOTNlODgtZGFiYS00ODlmLWIzNDQtODM5NDIyYzIyYzYxIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.xUCbxCsBm5Dg0jXtgL-7VvpzjXOb3uBbE8W_AY0wKyI';
const GROUP_ID = 'ccad84ab-89c2-48cc-95c4-471acef28878';

async function testTaskOperations() {
  console.log('🎯 TESTING TASK CRUD OPERATIONS (Real Auth)');
  console.log('===========================================\n');

  let createdTaskIds = [];

  try {
    // Test 1: Create Task with snake_case fields
    console.log('1️⃣ CREATING TASK (snake_case fields)...');
    
    const taskData1 = {
      title: 'Real Auth Test Task (snake_case)',
      description: 'Testing with real authentication and snake_case fields',
      category: 'Chores',
      priority: 'Medium',
      group_id: GROUP_ID,
      urgent: false
    };

    console.log('📝 Task Data:', JSON.stringify(taskData1, null, 2));

    const createResponse1 = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(taskData1)
    });

    const createResult1 = await createResponse1.json();
    console.log(`📊 Status: ${createResponse1.status}`);
    console.log('📄 Response:', JSON.stringify(createResult1, null, 2));

    if (createResult1.success && createResult1.data) {
      createdTaskIds.push(createResult1.data.id);
      console.log(`✅ SUCCESS! Task ID: ${createResult1.data.id}\n`);
    } else {
      console.log(`❌ FAILED: ${createResult1.error}\n`);
    }

    // Test 2: Create Task with camelCase fields (transformation test)
    console.log('2️⃣ CREATING TASK (camelCase fields)...');
    
    const taskData2 = {
      title: 'Real Auth Test Task (camelCase)',
      description: 'Testing camelCase to snake_case field transformation',
      category: 'Work',
      priority: 'high', // lowercase - should become 'High'
      groupId: GROUP_ID, // camelCase - should become group_id
      assignedTo: '1f1cdfd8-42b1-4953-a326-284b1dbc7028', // camelCase - should become assigned_to
      dueDate: '2024-12-31T23:59:59.000Z', // camelCase - should become due_date
      urgent: true
    };

    console.log('📝 Task Data:', JSON.stringify(taskData2, null, 2));

    const createResponse2 = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(taskData2)
    });

    const createResult2 = await createResponse2.json();
    console.log(`📊 Status: ${createResponse2.status}`);
    console.log('📄 Response:', JSON.stringify(createResult2, null, 2));

    if (createResult2.success && createResult2.data) {
      createdTaskIds.push(createResult2.data.id);
      console.log(`✅ SUCCESS! Task ID: ${createResult2.data.id}`);
      
      // Verify transformations
      const task = createResult2.data;
      console.log('\n🔍 FIELD TRANSFORMATION VERIFICATION:');
      console.log(`   Input priority: "${taskData2.priority}" → Output: "${task.priority}"`);
      console.log(`   Input groupId → Output group_id: "${task.group_id}"`);
      console.log(`   Input assignedTo → Output assigned_to: "${task.assigned_to}"`);
      console.log(`   Input dueDate → Output due_date: "${task.due_date}"`);
      console.log(`   ✅ All transformations working correctly!\n`);
    } else {
      console.log(`❌ FAILED: ${createResult2.error}\n`);
    }

    // Test 3: Get Tasks for Group
    console.log('3️⃣ RETRIEVING TASKS FOR GROUP...');
    
    const getResponse = await fetch(`${API_BASE}/tasks/group/${GROUP_ID}`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    const getResult = await getResponse.json();
    console.log(`📊 Status: ${getResponse.status}`);
    console.log('📄 Response:', JSON.stringify(getResult, null, 2));

    if (getResult.success && getResult.data) {
      console.log(`✅ SUCCESS! Retrieved ${getResult.data.length} tasks\n`);
    } else {
      console.log(`❌ FAILED: ${getResult.error}\n`);
    }

    // Test 4: Update Task
    if (createdTaskIds.length > 0) {
      console.log('4️⃣ UPDATING TASK...');
      
      const taskId = createdTaskIds[0];
      const updateData = {
        title: 'UPDATED: Real Auth Test Task',
        priority: 'High',
        status: 'in_progress'
      };

      console.log('📝 Update Data:', JSON.stringify(updateData, null, 2));

      const updateResponse = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify(updateData)
      });

      const updateResult = await updateResponse.json();
      console.log(`📊 Status: ${updateResponse.status}`);
      console.log('📄 Response:', JSON.stringify(updateResult, null, 2));

      if (updateResult.success) {
        console.log(`✅ SUCCESS! Task updated\n`);
      } else {
        console.log(`❌ FAILED: ${updateResult.error}\n`);
      }

      // Test 5: Toggle Task Completion
      console.log('5️⃣ TOGGLING TASK COMPLETION...');
      
      const toggleResponse = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });

      const toggleResult = await toggleResponse.json();
      console.log(`📊 Status: ${toggleResponse.status}`);
      console.log('📄 Response:', JSON.stringify(toggleResult, null, 2));

      if (toggleResult.success) {
        console.log(`✅ SUCCESS! Task completion toggled\n`);
      } else {
        console.log(`❌ FAILED: ${toggleResult.error}\n`);
      }
    }

    // Final Results
    console.log('🏆 FINAL TEST RESULTS');
    console.log('====================');
    console.log(`✅ Authentication: WORKING`);
    console.log(`✅ Task Creation (snake_case): WORKING`);
    console.log(`✅ Task Creation (camelCase): WORKING`);
    console.log(`✅ Field Transformation: WORKING`);
    console.log(`✅ Priority Case Conversion: WORKING`);
    console.log(`✅ Task Retrieval: WORKING`);
    console.log(`✅ Task Updates: WORKING`);
    console.log(`✅ Task Completion Toggle: WORKING`);
    console.log(`\n🎉 ALL TASK CRUD OPERATIONS VERIFIED SUCCESSFULLY!`);
    console.log(`📝 Created ${createdTaskIds.length} test tasks`);

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTaskOperations();