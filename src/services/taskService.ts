import { supabase } from '../config/supabase';
import type {
  CreateTaskData,
  UpdateTaskData,
  TaskFiltersData,
  AssignTaskData,
  BulkTaskUpdateData,
} from '../validators/taskValidator';

// Database types
export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_by: string;
  group_id: string;
  due_date: string | null;
  urgent: boolean;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskWithAssignee extends Task {
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

// Create a new task
export const createTask = async (taskData: CreateTaskData, createdBy: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...taskData,
      created_by: createdBy,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Create task error:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return data;
};

// Get tasks by group with optional filters
export const getTasksByGroup = async (
  groupId: string, 
  filters: TaskFiltersData = { limit: 50, offset: 0 }
): Promise<TaskWithAssignee[]> => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:assigned_to (
        id,
        name,
        email
      ),
      creator:created_by (
        id,
        name,
        email
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  
  if (filters.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  
  if (filters.urgent !== undefined) {
    query = query.eq('urgent', filters.urgent);
  }
  
  if (filters.completed !== undefined) {
    if (filters.completed) {
      query = query.eq('status', 'completed');
    } else {
      query = query.neq('status', 'completed');
    }
  }

  // Apply pagination
  query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

  const { data, error } = await query;

  if (error) {
    console.error('Get tasks error:', error);
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return data || [];
};

// Get tasks assigned to a specific user
export const getTasksByAssignee = async (
  userId: string,
  groupId?: string,
  filters: TaskFiltersData = { limit: 50, offset: 0 }
): Promise<TaskWithAssignee[]> => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:assigned_to (
        id,
        name,
        email
      ),
      creator:created_by (
        id,
        name,
        email
      )
    `)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false });

  if (groupId) {
    query = query.eq('group_id', groupId);
  }

  // Apply same filters as getTasksByGroup
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.urgent !== undefined) query = query.eq('urgent', filters.urgent);
  if (filters.completed !== undefined) {
    if (filters.completed) {
      query = query.eq('status', 'completed');
    } else {
      query = query.neq('status', 'completed');
    }
  }

  query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

  const { data, error } = await query;

  if (error) {
    console.error('Get user tasks error:', error);
    throw new Error(`Failed to fetch user tasks: ${error.message}`);
  }

  return data || [];
};

// Get a single task by ID
export const getTaskById = async (taskId: string): Promise<TaskWithAssignee | null> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:assigned_to (
        id,
        name,
        email
      ),
      creator:created_by (
        id,
        name,
        email
      )
    `)
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Task not found
    }
    console.error('Get task error:', error);
    throw new Error(`Failed to fetch task: ${error.message}`);
  }

  return data;
};

// Update a task
export const updateTask = async (
  taskId: string, 
  updates: UpdateTaskData, 
  userId: string
): Promise<Task> => {
  // If marking as completed, set completed_at timestamp
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.status === 'completed' && !updates.completed_at) {
    updateData.completed_at = new Date().toISOString();
  } else if (updates.status !== 'completed') {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Update task error:', error);
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data;
};

// Assign task to a user
export const assignTask = async (
  taskId: string, 
  assignData: AssignTaskData, 
  userId: string
): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      assigned_to: assignData.assigned_to,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Assign task error:', error);
    throw new Error(`Failed to assign task: ${error.message}`);
  }

  return data;
};

// Delete a task
export const deleteTask = async (taskId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Delete task error:', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
};

// Bulk update tasks
export const bulkUpdateTasks = async (
  updateData: BulkTaskUpdateData, 
  userId: string
): Promise<Task[]> => {
  const updates = {
    ...updateData.updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .in('id', updateData.taskIds)
    .select();

  if (error) {
    console.error('Bulk update tasks error:', error);
    throw new Error(`Failed to bulk update tasks: ${error.message}`);
  }

  return data || [];
};

// Get task statistics for a group
export const getTaskStats = async (groupId: string): Promise<{
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('status, due_date')
    .eq('group_id', groupId);

  if (error) {
    console.error('Get task stats error:', error);
    throw new Error(`Failed to fetch task statistics: ${error.message}`);
  }

  const total = data?.length || 0;
  const completed = data?.filter(task => task.status === 'completed').length || 0;
  const pending = data?.filter(task => task.status === 'pending').length || 0;
  const inProgress = data?.filter(task => task.status === 'in_progress').length || 0;
  
  const now = new Date();
  const overdue = data?.filter(task => 
    task.status !== 'completed' && 
    task.due_date && 
    new Date(task.due_date) < now
  ).length || 0;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    pending,
    inProgress,
    overdue,
    completionRate,
  };
};