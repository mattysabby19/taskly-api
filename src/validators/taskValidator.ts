import { z } from 'zod';

// Task status enum
export const TaskStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

// Task priority enum - accept both cases for frontend compatibility
export const TaskPriority = z.enum(['Low', 'Medium', 'High', 'low', 'medium', 'high'])
  .transform(val => {
    // Always convert to title case for database consistency
    switch(val.toLowerCase()) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      default: return val;
    }
  });

// Task category enum
export const TaskCategory = z.enum(['Chores', 'Kids', 'Work', 'Projects', 'Personal', 'Shopping']);

// Base task data schema - accepts both camelCase (frontend) and snake_case (backend)
const baseTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(100, 'Task title must be less than 100 characters')
    .trim(),
  
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .default(''),
  
  category: TaskCategory,
  priority: TaskPriority,
  urgent: z.boolean().default(false),
  
  estimated_minutes: z
    .number()
    .int()
    .min(1, 'Estimated time must be at least 1 minute')
    .max(1440, 'Estimated time cannot exceed 24 hours')
    .optional(),
});

// Create task schema with field transformation
export const createTaskSchema = baseTaskSchema.extend({
  // Accept both frontend (camelCase) and backend (snake_case) field names
  assignedTo: z.string().uuid('Invalid user ID').optional(),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
  assignee_id: z.string().uuid('Invalid user ID').optional(),
  
  groupId: z.string().uuid('Invalid group ID').optional(),
  group_id: z.string().uuid('Invalid group ID').optional(),
  
  dueDate: z.string().datetime('Invalid due date format').optional(),
  due_date: z.string().datetime('Invalid due date format').optional(),
}).transform((data) => {
  // Transform frontend camelCase to backend snake_case
  const transformed: any = { ...data };
  
  // Handle assignee_id field
  if (data.assignedTo && !data.assignee_id) {
    transformed.assignee_id = data.assignedTo;
    delete transformed.assignedTo;
  } else if (data.assigned_to && !data.assignee_id) {
    transformed.assignee_id = data.assigned_to;
    delete transformed.assigned_to;
  }
  
  // Handle group_id field
  if (data.groupId && !data.group_id) {
    transformed.group_id = data.groupId;
    delete transformed.groupId;
  }
  
  // Handle due_date field
  if (data.dueDate && !data.due_date) {
    transformed.due_date = data.dueDate;
    delete transformed.dueDate;
  }
  
  // Ensure group_id is present (required for task creation)
  if (!transformed.group_id) {
    throw new Error('Group ID is required for task creation');
  }
  
  return transformed;
});

// Update task schema
export const updateTaskSchema = baseTaskSchema.partial().extend({
  // Accept both frontend and backend field names for updates
  assignedTo: z.string().uuid('Invalid user ID').nullable().optional(),
  assigned_to: z.string().uuid('Invalid user ID').nullable().optional(),
  assignee_id: z.string().uuid('Invalid user ID').nullable().optional(),
  
  dueDate: z.string().datetime('Invalid due date format').nullable().optional(),
  due_date: z.string().datetime('Invalid due date format').nullable().optional(),
  
  status: TaskStatus.optional(),
  completed_at: z.string().datetime('Invalid completion date format').nullable().optional(),
}).transform((data) => {
  // Transform frontend camelCase to backend snake_case for updates
  const transformed: any = { ...data };
  
  if (data.assignedTo !== undefined && data.assignee_id === undefined) {
    transformed.assignee_id = data.assignedTo;
    delete transformed.assignedTo;
  } else if (data.assigned_to !== undefined && data.assignee_id === undefined) {
    transformed.assignee_id = data.assigned_to;
    delete transformed.assigned_to;
  }
  
  if (data.dueDate !== undefined && data.due_date === undefined) {
    transformed.due_date = data.dueDate;
    delete transformed.dueDate;
  }
  
  return transformed;
});

// Query filters schema
export const taskFiltersSchema = z.object({
  status: TaskStatus.optional(),
  category: TaskCategory.optional(),
  priority: TaskPriority.optional(),
  assigned_to: z.string().uuid().optional(),
  urgent: z.boolean().optional(),
  completed: z.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Task assignment schema
export const assignTaskSchema = z.object({
  assigned_to: z.string().uuid('Invalid user ID').optional(),
  assignee_id: z.string().uuid('Invalid user ID').optional(),
}).transform((data) => {
  // Ensure we have assignee_id for database
  if (data.assigned_to && !data.assignee_id) {
    return { assigned_to: data.assigned_to }; // Keep as assigned_to for compatibility
  }
  return data;
});

// Bulk task operations schema  
export const bulkTaskUpdateSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, 'At least one task ID is required'),
  updates: baseTaskSchema.partial().extend({
    // Accept both frontend and backend field names for updates
    assignedTo: z.string().uuid('Invalid user ID').nullable().optional(),
    assigned_to: z.string().uuid('Invalid user ID').nullable().optional(),
    assignee_id: z.string().uuid('Invalid user ID').nullable().optional(),
    
    dueDate: z.string().datetime('Invalid due date format').nullable().optional(),
    due_date: z.string().datetime('Invalid due date format').nullable().optional(),
    
    status: TaskStatus.optional(),
    // Note: completed_at is excluded from bulk updates for safety
  }).transform((data) => {
    const transformed: any = { ...data };
    
    if (data.assignedTo !== undefined && data.assignee_id === undefined) {
      transformed.assignee_id = data.assignedTo;
      delete transformed.assignedTo;
    } else if (data.assigned_to !== undefined && data.assignee_id === undefined) {
      transformed.assignee_id = data.assigned_to;
      delete transformed.assigned_to;
    }
    
    if (data.dueDate !== undefined && data.due_date === undefined) {
      transformed.due_date = data.dueDate;
      delete transformed.dueDate;
    }
    
    return transformed;
  }),
});

// Export types
export type CreateTaskData = z.infer<typeof createTaskSchema>;
export type UpdateTaskData = z.infer<typeof updateTaskSchema>;
export type TaskFiltersData = z.infer<typeof taskFiltersSchema>;
export type AssignTaskData = z.infer<typeof assignTaskSchema>;
export type BulkTaskUpdateData = z.infer<typeof bulkTaskUpdateSchema>;

// Validation function
export const validate = (schema: 'createTask' | 'updateTask' | 'taskFilters' | 'assignTask' | 'bulkUpdate', data: any) => {
  switch (schema) {
    case 'createTask':
      return createTaskSchema.parse(data);
    case 'updateTask':
      return updateTaskSchema.parse(data);
    case 'taskFilters':
      return taskFiltersSchema.parse(data);
    case 'assignTask':
      return assignTaskSchema.parse(data);
    case 'bulkUpdate':
      return bulkTaskUpdateSchema.parse(data);
    default:
      throw new Error(`Unknown schema: ${schema}`);
  }
};