// Debug priority validation issue
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';

async function debugPriority() {
  console.log('🔍 DEBUGGING PRIORITY VALIDATION ISSUE');
  console.log('=====================================\n');

  // Login first
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'authtest1753561906486@example.com',
      password: 'Test123456'
    })
  });

  const loginResult = await loginResponse.json();
  if (!loginResult.success) {
    console.log('❌ Login failed');
    return;
  }

  const authToken = loginResult.token;
  console.log('✅ Login successful\n');

  // Test different priority values
  const priorityTests = [
    { priority: 'Medium', desc: 'Title case Medium' },
    { priority: 'medium', desc: 'lowercase medium' }, 
    { priority: 'MEDIUM', desc: 'uppercase MEDIUM' },
    { priority: 'Low', desc: 'Title case Low' },
    { priority: 'High', desc: 'Title case High' }
  ];

  for (const test of priorityTests) {
    console.log(`🧪 Testing priority: "${test.priority}" (${test.desc})`);
    
    const taskData = {
      title: `Priority Test: ${test.priority}`,
      description: `Testing priority value: ${test.priority}`,
      category: 'Chores',
      priority: test.priority,
      urgent: false
    };

    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(taskData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`   ✅ SUCCESS: Task created with priority "${result.data.priority}"`);
    } else {
      console.log(`   ❌ FAILED: ${result.error}`);
    }
    console.log('');
  }
}

debugPriority().catch(console.error);