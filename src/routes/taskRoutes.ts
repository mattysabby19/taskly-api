import express from 'express';
import * as taskController from '../controllers/taskController';
import { requireAuth } from '../middleware/auth';
import { groupGuard } from '../middleware/groupGuard';

const router = express.Router();

// All task routes require authentication
router.use(requireAuth);

// Create a new task
router.post('/', taskController.createTask);

// Get current user's tasks across all groups
router.get('/my-tasks', taskController.getMyTasks);

// Get tasks for a specific group
router.get('/group/:groupId', taskController.getGroupTasks);

// Get task statistics for a group
router.get('/group/:groupId/stats', taskController.getTaskStats);

// Get tasks assigned to a specific user (requires group membership)
router.get('/user/:userId', taskController.getUserTasks);

// Get a single task by ID
router.get('/:taskId', taskController.getTask);

// Update a task
router.patch('/:taskId', taskController.updateTask);

// Assign a task to a user
router.patch('/:taskId/assign', taskController.assignTask);

// Complete a task (shortcut)
router.patch('/:taskId/complete', taskController.completeTask);

// Delete a task
router.delete('/:taskId', taskController.deleteTask);

// Bulk operations
router.patch('/bulk/update', taskController.bulkUpdateTasks);

export default router;