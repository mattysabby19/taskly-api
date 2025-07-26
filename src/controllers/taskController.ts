import { Request, Response } from 'express';
import * as taskService from '../services/taskService';
import { 
  createTaskSchema, 
  updateTaskSchema, 
  taskFiltersSchema,
  assignTaskSchema,
  bulkTaskUpdateSchema
} from '../validators/taskValidator';

// Create a new task
export const createTask = async (req: Request, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const userId = (req as any).user.id;
    
    const task = await taskService.createTask(data, userId);
    res.status(201).json(task);
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(400).json({ error: error.message || 'Failed to create task' });
  }
};

// Get tasks for a group with optional filters
export const getGroupTasks = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const filters = taskFiltersSchema.parse(req.query);
    
    const tasks = await taskService.getTasksByGroup(groupId, filters);
    res.json(tasks);
  } catch (error: any) {
    console.error('Get group tasks error:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch tasks' });
  }
};

// Get tasks assigned to the current user
export const getMyTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { groupId } = req.query;
    const filters = taskFiltersSchema.parse(req.query);
    
    const tasks = await taskService.getTasksByAssignee(
      userId, 
      groupId as string, 
      filters
    );
    res.json(tasks);
  } catch (error: any) {
    console.error('Get my tasks error:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch user tasks' });
  }
};

// Get tasks assigned to a specific user (for group admins)
export const getUserTasks = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { groupId } = req.query;
    const filters = taskFiltersSchema.parse(req.query);
    
    const tasks = await taskService.getTasksByAssignee(
      userId, 
      groupId as string, 
      filters
    );
    res.json(tasks);
  } catch (error: any) {
    console.error('Get user tasks error:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch user tasks' });
  }
};

// Get a single task by ID
export const getTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const task = await taskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error: any) {
    console.error('Get task error:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch task' });
  }
};

// Update a task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updates = updateTaskSchema.parse(req.body);
    const userId = (req as any).user.id;
    
    const task = await taskService.updateTask(taskId, updates, userId);
    res.json(task);
  } catch (error: any) {
    console.error('Update task error:', error);
    res.status(400).json({ error: error.message || 'Failed to update task' });
  }
};

// Assign a task to a user
export const assignTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const assignData = assignTaskSchema.parse(req.body);
    const userId = (req as any).user.id;
    
    const task = await taskService.assignTask(taskId, assignData, userId);
    res.json(task);
  } catch (error: any) {
    console.error('Assign task error:', error);
    res.status(400).json({ error: error.message || 'Failed to assign task' });
  }
};

// Delete a task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).user.id;
    
    await taskService.deleteTask(taskId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete task error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete task' });
  }
};

// Bulk update tasks
export const bulkUpdateTasks = async (req: Request, res: Response) => {
  try {
    const updateData = bulkTaskUpdateSchema.parse(req.body);
    const userId = (req as any).user.id;
    
    const tasks = await taskService.bulkUpdateTasks(updateData, userId);
    res.json(tasks);
  } catch (error: any) {
    console.error('Bulk update tasks error:', error);
    res.status(400).json({ error: error.message || 'Failed to bulk update tasks' });
  }
};

// Get task statistics for a group
export const getTaskStats = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    
    const stats = await taskService.getTaskStats(groupId);
    res.json(stats);
  } catch (error: any) {
    console.error('Get task stats error:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch task statistics' });
  }
};

// Complete a task (shortcut for updating status to completed)
export const completeTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).user.id;
    
    const task = await taskService.updateTask(
      taskId, 
      { 
        status: 'completed',
        completed_at: new Date().toISOString()
      }, 
      userId
    );
    res.json(task);
  } catch (error: any) {
    console.error('Complete task error:', error);
    res.status(400).json({ error: error.message || 'Failed to complete task' });
  }
};