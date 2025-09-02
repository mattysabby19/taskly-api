// Create a simple test server to bypass auth for endpoint testing
const express = require('express');
const cors = require('cors');

// Import our fixed controllers and validators
const taskController = require('./src/controllers/taskController');

const app = express();
app.use(cors());
app.use(express.json());

// Mock auth middleware for testing
const mockAuth = (req, res, next) => {
  req.user = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    group_id: '123e4567-e89b-12d3-a456-426614174000',
    is_admin: true
  };
  next();
};

// Apply mock auth to all routes
app.use(mockAuth);

// Task routes
app.post('/api/tasks', taskController.createTask);
app.get('/api/tasks/group/:groupId', taskController.getGroupTasks);
app.get('/api/tasks/:taskId', taskController.getTask);
app.patch('/api/tasks/:taskId', taskController.updateTask);
app.patch('/api/tasks/:taskId/toggle', taskController.toggleTaskCompletion);
app.delete('/api/tasks/:taskId', taskController.deleteTask);

// Start test server
const PORT = 4001;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log('🔓 Authentication bypassed for testing');
});

// Run automated tests after server starts
setTimeout(async () => {
  const fetch = require('node-fetch');
  const API_BASE = `http://localhost:${PORT}/api`;

  console.log('\\n🚀 Starting Automated API Tests\\n');

  let createdTaskId = null;

  // Test 1: Create Task with snake_case
  console.log('1️⃣ Testing Task Creation (snake_case)');
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Task (snake_case)',
        description: 'Created via API test',
        category: 'Chores',
        priority: 'Medium',
        group_id: '123e4567-e89b-12d3-a456-426614174000',
        urgent: false
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      createdTaskId = result.data.id;
      console.log('✅ Task created successfully!');
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }

  // Test 2: Create Task with camelCase
  console.log('\\n2️⃣ Testing Task Creation (camelCase)');
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Task (camelCase)',
        description: 'Testing field transformation',
        category: 'Work',
        priority: 'high', // lowercase
        groupId: '123e4567-e89b-12d3-a456-426614174000', // camelCase
        assignedTo: '987fcdeb-51a2-43d6-8f9e-123456789abc', // camelCase
        dueDate: '2024-12-31T23:59:59.000Z', // camelCase
        urgent: true
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ CamelCase task created successfully!');
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }

  // Test 3: Get Tasks
  console.log('\\n3️⃣ Testing Task Retrieval');
  try {
    const response = await fetch(`${API_BASE}/tasks/group/123e4567-e89b-12d3-a456-426614174000`);
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Retrieved ${result.data?.length || 0} tasks successfully!`);
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }

  // Test 4: Update Task (if we have a created task)
  if (createdTaskId) {
    console.log('\\n4️⃣ Testing Task Update');
    try {
      const response = await fetch(`${API_BASE}/tasks/${createdTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Task Title',
          priority: 'High',
          status: 'in_progress'
        })
      });
      
      const result = await response.json();
      console.log(`Status: ${response.status}`);
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Task updated successfully!');
      }
    } catch (error) {
      console.error('❌ Test 4 failed:', error.message);
    }

    // Test 5: Toggle Task Completion
    console.log('\\n5️⃣ Testing Task Completion Toggle');
    try {
      const response = await fetch(`${API_BASE}/tasks/${createdTaskId}/toggle`, {
        method: 'PATCH'
      });
      
      const result = await response.json();
      console.log(`Status: ${response.status}`);
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Task completion toggled successfully!');
      }
    } catch (error) {
      console.error('❌ Test 5 failed:', error.message);
    }
  }

  console.log('\\n🎉 API Testing Complete!');
  console.log('🛑 Shutting down test server...');
  process.exit(0);
}, 1000);