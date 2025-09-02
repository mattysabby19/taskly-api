const fetch = require('node-fetch');

async function testTaskUpdate() {
  console.log('Testing task update endpoint...');
  
  // Get auth token
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: 'authtest1753561906486@example.com', password: 'Test123456'})
  });
  const {token} = await loginRes.json();
  
  // First, create a task to update
  console.log('\n1. Creating a test task...');
  const createRes = await fetch('http://localhost:4000/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Task Update Test',
      description: 'Testing task updates',
      category: 'Chores',
      priority: 'Medium',
      urgent: false
    })
  });
  
  if (!createRes.ok) {
    console.log('Failed to create test task');
    return;
  }
  
  const createData = await createRes.json();
  const taskId = createData.data.id;
  console.log('Created task:', taskId);
  
  // Now test updating it
  console.log('\n2. Testing task update...');
  const updateRes = await fetch(`http://localhost:4000/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'UPDATED: Task Update Test',
      priority: 'High',
      status: 'in_progress'
    })
  });
  
  console.log('Update Status:', updateRes.status);
  if (updateRes.ok) {
    const updateData = await updateRes.json();
    console.log('Success! Updated task title:', updateData.data.title);
    console.log('New priority:', updateData.data.priority);
    console.log('New status:', updateData.data.status);
  } else {
    const error = await updateRes.text();
    console.log('Update Error:', error);
  }
}

testTaskUpdate().catch(console.error);