import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { validate } from '../validators/taskValidator';

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Task Validator', () => {
  describe('createTask validation', () => {
    it('should validate a valid create task request', () => {
      const validData = {
        title: 'Test Task',
        description: 'Test description',
        category: 'Chores',
        priority: 'Medium',
        groupId: '123e4567-e89b-12d3-a456-426614174000',
        urgent: false,
      };

      const result = validate('createTask', validData);
      expect(result.title).toBe('Test Task');
      expect(result.category).toBe('Chores');
      expect(result.priority).toBe('Medium');
    });

    it('should reject invalid task data', () => {
      const invalidData = {
        title: '', // Empty title
        category: 'InvalidCategory',
        priority: 'InvalidPriority',
        groupId: 'invalid-uuid',
      };

      expect(() => validate('createTask', invalidData)).toThrow();
    });

    it('should apply default values', () => {
      const minimalData = {
        title: 'Test Task',
        category: 'Chores',
        priority: 'Medium',
        groupId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validate('createTask', minimalData);
      expect(result.description).toBe('');
      expect(result.urgent).toBe(false);
    });
  });

  describe('updateTask validation', () => {
    it('should validate partial updates', () => {
      const updateData = {
        title: 'Updated Task',
        status: 'completed',
      };

      const result = validate('updateTask', updateData);
      expect(result.title).toBe('Updated Task');
      expect(result.status).toBe('completed');
    });

    it('should allow null values for optional fields', () => {
      const updateData = {
        assignedTo: null,
        dueDate: null,
      };

      const result = validate('updateTask', updateData);
      expect(result.assignedTo).toBeNull();
      expect(result.dueDate).toBeNull();
    });
  });

  describe('taskFilters validation', () => {
    it('should validate filter parameters', () => {
      const filters = {
        status: 'pending',
        category: 'Chores',
        limit: 10,
        offset: 0,
      };

      const result = validate('taskFilters', filters);
      expect(result.status).toBe('pending');
      expect(result.limit).toBe(10);
    });

    it('should apply default pagination values', () => {
      const filters = {};

      const result = validate('taskFilters', filters);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });
});

describe('Task Service', () => {
  // Note: These would be integration tests that require a test database
  // For now, we're just testing the validation layer
  
  it('should have proper task service functions', () => {
    const taskService = require('../services/taskService');
    
    expect(typeof taskService.createTask).toBe('function');
    expect(typeof taskService.getTasksByGroup).toBe('function');
    expect(typeof taskService.updateTask).toBe('function');
    expect(typeof taskService.deleteTask).toBe('function');
  });
});