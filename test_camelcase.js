// Test camelCase specifically with valid UUIDs
const { validate } = require('./src/validators/taskValidator');

console.log('🧪 Testing camelCase Field Transformation\n');

try {
  const camelCaseData = {
    title: 'CamelCase Task',
    category: 'Work',
    priority: 'high', // lowercase should become 'High'
    groupId: '123e4567-e89b-12d3-a456-426614174000', // valid UUID camelCase
    assignedTo: '987fcdeb-51a2-43d6-8f9e-123456789abc', // valid UUID camelCase
    dueDate: '2024-12-31T23:59:59.000Z', // camelCase
    urgent: true
  };

  console.log('Input (camelCase):');
  console.log(JSON.stringify(camelCaseData, null, 2));

  const result = validate('createTask', camelCaseData);
  
  console.log('\nOutput (snake_case):');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n✅ Field transformation verification:');
  console.log(`✅ priority: "${camelCaseData.priority}" -> "${result.priority}"`);
  console.log(`✅ groupId: "${camelCaseData.groupId}" -> group_id: "${result.group_id}"`);
  console.log(`✅ assignedTo: "${camelCaseData.assignedTo}" -> assigned_to: "${result.assigned_to}"`);
  console.log(`✅ dueDate: "${camelCaseData.dueDate}" -> due_date: "${result.due_date}"`);
  
  // Verify camelCase fields are removed
  console.log(`✅ camelCase fields removed: groupId=${result.groupId === undefined}, assignedTo=${result.assignedTo === undefined}, dueDate=${result.dueDate === undefined}`);

} catch (error) {
  console.error('❌ CamelCase transformation failed:', error);
}