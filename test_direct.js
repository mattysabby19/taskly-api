// Direct test of task validator and service logic without auth
const { validate } = require('./src/validators/taskValidator');

console.log('🧪 Testing Task Validation Logic Directly\n');

// Test 1: Valid task creation
console.log('1️⃣ Testing Valid Task Creation');
try {
  const validTaskData = {
    title: 'Test Task',
    description: 'Test description',
    category: 'Chores',
    priority: 'Medium',
    group_id: '123e4567-e89b-12d3-a456-426614174000',
    urgent: false,
  };

  const result = validate('createTask', validTaskData);
  console.log('✅ Valid task validation passed:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ Valid task validation failed:', error.message);
}

console.log('\n2️⃣ Testing camelCase to snake_case Transformation');
try {
  const camelCaseData = {
    title: 'CamelCase Task',
    category: 'Work',
    priority: 'high', // lowercase
    groupId: 'test-group-id', // camelCase
    assignedTo: '123e4567-e89b-12d3-a456-426614174000', // camelCase
    dueDate: '2024-12-31T23:59:59.000Z', // camelCase
    urgent: true
  };

  const result = validate('createTask', camelCaseData);
  console.log('✅ CamelCase transformation passed:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ CamelCase transformation failed:', error.message);
}

console.log('\n3️⃣ Testing Update Task Validation');
try {
  const updateData = {
    title: 'Updated Task',
    assignedTo: '123e4567-e89b-12d3-a456-426614174000',
    dueDate: '2024-12-31T23:59:59.000Z',
    status: 'completed'
  };

  const result = validate('updateTask', updateData);
  console.log('✅ Update validation passed:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ Update validation failed:', error.message);
}

console.log('\n4️⃣ Testing Filter Validation');
try {
  const filters = {
    status: 'pending',
    category: 'Chores',
    limit: 10,
    offset: 0,
  };

  const result = validate('taskFilters', filters);
  console.log('✅ Filter validation passed:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ Filter validation failed:', error.message);
}

console.log('\n5️⃣ Testing Priority Case Conversion');
try {
  const lowercasePriorityData = {
    title: 'Priority Test',
    category: 'Chores',
    priority: 'low', // lowercase should convert to 'Low'
    group_id: '123e4567-e89b-12d3-a456-426614174000',
  };

  const result = validate('createTask', lowercasePriorityData);
  console.log('✅ Priority conversion passed:');
  console.log(`Original: "low" -> Converted: "${result.priority}"`);
} catch (error) {
  console.error('❌ Priority conversion failed:', error.message);
}

console.log('\n✅ Validation Testing Complete!');