// Quick API test without full auth setup
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';

// Test with a mock JWT that the server should accept
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdC11c2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZ3JvdXBfaWQiOiJ0ZXN0LWdyb3VwIiwiaXNfYWRtaW4iOnRydWV9.test';

async function testTaskEndpoints() {
  console.log('🧪 Testing Task CRUD API Endpoints\n');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MOCK_TOKEN}`
  };

  // Test 1: Create Task
  console.log('1️⃣ Testing Task Creation');
  const createTaskData = {
    title: 'Test API Task',
    description: 'This task was created via API test',
    category: 'Chores', 
    priority: 'Medium',
    group_id: 'test-group-id',
    urgent: false
  };

  try {
    const createResponse = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(createTaskData)
    });
    
    const createResult = await createResponse.text();
    console.log(`Status: ${createResponse.status}`);
    console.log('Response:', createResult);
    console.log('');
  } catch (error) {
    console.error('❌ Create task failed:', error.message);
  }

  // Test 2: Get Tasks
  console.log('2️⃣ Testing Task Retrieval');
  try {
    const getResponse = await fetch(`${API_BASE}/tasks/group/test-group-id`, {
      method: 'GET',
      headers
    });
    
    const getResult = await getResponse.text();
    console.log(`Status: ${getResponse.status}`);
    console.log('Response:', getResult);
    console.log('');
  } catch (error) {
    console.error('❌ Get tasks failed:', error.message);
  }

  // Test 3: Test with camelCase field names (frontend format)
  console.log('3️⃣ Testing camelCase Field Support');
  const camelCaseTaskData = {
    title: 'CamelCase Test Task',
    description: 'Testing field name transformation',
    category: 'Work',
    priority: 'high', // lowercase priority
    groupId: 'test-group-id', // camelCase
    assignedTo: 'test-user-id', // camelCase
    dueDate: '2024-12-31T23:59:59.000Z', // camelCase
    urgent: true
  };

  try {
    const camelResponse = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(camelCaseTaskData)
    });
    
    const camelResult = await camelResponse.text();
    console.log(`Status: ${camelResponse.status}`);
    console.log('Response:', camelResult);
    console.log('');
  } catch (error) {
    console.error('❌ CamelCase test failed:', error.message);
  }

  console.log('✅ API Testing Complete!');
}

testTaskEndpoints();