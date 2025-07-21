import { z } from 'zod';

// Task status enum
export const TaskStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

// Task priority enum  
export const TaskPriority = z.enum(['Low', 'Medium', 'High']);

// Task category enum
export const TaskCategory = z.enum(['Chores', 'Kids', 'Work', 'Projects', 'Personal', 'Shopping']);

// Create task schema
export const createTaskSchema = z.object({
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
  
  assigned_to: z
    .string()
    .uuid('Invalid user ID')
    .optional(),
  
  group_id: z
    .string()
    .uuid('Invalid group ID'),
  
  due_date: z
    .string()
    .datetime('Invalid due date format')
    .optional(),
  
  urgent: z.boolean().default(false),
  
  estimated_minutes: z
    .number()
    .int()
    .min(1, 'Estimated time must be at least 1 minute')
    .max(1440, 'Estimated time cannot exceed 24 hours')
    .optional(),
});

// Update task schema
export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(100, 'Task title must be less than 100 characters')
    .trim()
    .optional(),
  
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  category: TaskCategory.optional(),
  
  priority: TaskPriority.optional(),
  
  assigned_to: z
    .string()
    .uuid('Invalid user ID')
    .nullable()
    .optional(),
  
  status: TaskStatus.optional(),
  
  due_date: z
    .string()
    .datetime('Invalid due date format')
    .nullable()
    .optional(),
  
  urgent: z.boolean().optional(),
  
  estimated_minutes: z
    .number()
    .int()
    .min(1, 'Estimated time must be at least 1 minute')
    .max(1440, 'Estimated time cannot exceed 24 hours')
    .nullable()
    .optional(),
  
  completed_at: z
    .string()
    .datetime('Invalid completion date format')
    .nullable()
    .optional(),
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
  assigned_to: z.string().uuid('Invalid user ID'),
});

// Bulk task operations schema
export const bulkTaskUpdateSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, 'At least one task ID is required'),
  updates: updateTaskSchema.omit({ completed_at: true }),
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