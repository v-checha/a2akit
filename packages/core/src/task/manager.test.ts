import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from './manager.js';
import { TaskNotFoundError, InvalidStateTransitionError } from '../errors/index.js';
import type { Message, Artifact } from '../types/protocol.js';

describe('TaskManager', () => {
  let manager: TaskManager;

  beforeEach(() => {
    manager = new TaskManager();
  });

  describe('create', () => {
    it('should create a new task in submitted state', () => {
      const task = manager.create({ id: 'task-1' });

      expect(task.id).toBe('task-1');
      expect(task.status.state).toBe('submitted');
      expect(task.status.timestamp).toBeDefined();
      expect(task.history).toEqual([]);
      expect(task.artifacts).toEqual([]);
    });

    it('should create task with contextId', () => {
      const task = manager.create({ id: 'task-1', contextId: 'ctx-1' });

      expect(task.contextId).toBe('ctx-1');
    });

    it('should create task with metadata', () => {
      const task = manager.create({
        id: 'task-1',
        metadata: { skillId: 'greet', custom: 'value' },
      });

      expect(task.metadata).toEqual({ skillId: 'greet', custom: 'value' });
    });

    it('should return existing task if ID already exists', () => {
      const task1 = manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const task2 = manager.create({ id: 'task-1' });

      expect(task2).toBe(task1);
      expect(task2.status.state).toBe('working');
    });
  });

  describe('get', () => {
    it('should return task by ID', () => {
      manager.create({ id: 'task-1' });
      const task = manager.get('task-1');

      expect(task).toBeDefined();
      expect(task?.id).toBe('task-1');
    });

    it('should return undefined for non-existent task', () => {
      const task = manager.get('non-existent');

      expect(task).toBeUndefined();
    });
  });

  describe('getOrThrow', () => {
    it('should return task by ID', () => {
      manager.create({ id: 'task-1' });
      const task = manager.getOrThrow('task-1');

      expect(task.id).toBe('task-1');
    });

    it('should throw TaskNotFoundError for non-existent task', () => {
      expect(() => manager.getOrThrow('non-existent')).toThrow(TaskNotFoundError);
    });
  });

  describe('has', () => {
    it('should return true for existing task', () => {
      manager.create({ id: 'task-1' });

      expect(manager.has('task-1')).toBe(true);
    });

    it('should return false for non-existent task', () => {
      expect(manager.has('non-existent')).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('should update task state with valid transition', () => {
      manager.create({ id: 'task-1' });
      const task = manager.updateStatus('task-1', 'working');

      expect(task.status.state).toBe('working');
      expect(task.status.timestamp).toBeDefined();
    });

    it('should include status message when provided', () => {
      manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const message: Message = {
        role: 'agent',
        parts: [{ type: 'text', text: 'Done!' }],
      };
      const task = manager.updateStatus('task-1', 'completed', message);

      expect(task.status.message).toEqual(message);
    });

    it('should throw InvalidStateTransitionError for invalid transition', () => {
      manager.create({ id: 'task-1' });

      expect(() => manager.updateStatus('task-1', 'completed')).toThrow(
        InvalidStateTransitionError
      );
    });

    it('should throw TaskNotFoundError for non-existent task', () => {
      expect(() => manager.updateStatus('non-existent', 'working')).toThrow(
        TaskNotFoundError
      );
    });
  });

  describe('setWorking', () => {
    it('should transition to working state', () => {
      manager.create({ id: 'task-1' });
      const task = manager.setWorking('task-1');

      expect(task.status.state).toBe('working');
    });
  });

  describe('setCompleted', () => {
    it('should transition to completed state', () => {
      manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const task = manager.setCompleted('task-1');

      expect(task.status.state).toBe('completed');
    });

    it('should include completion message', () => {
      manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const message: Message = {
        role: 'agent',
        parts: [{ type: 'text', text: 'Task completed!' }],
      };
      const task = manager.setCompleted('task-1', message);

      expect(task.status.message).toEqual(message);
    });
  });

  describe('setFailed', () => {
    it('should transition to failed state', () => {
      manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const task = manager.setFailed('task-1');

      expect(task.status.state).toBe('failed');
    });

    it('should include failure message', () => {
      manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const message: Message = {
        role: 'agent',
        parts: [{ type: 'text', text: 'Task failed!' }],
      };
      const task = manager.setFailed('task-1', message);

      expect(task.status.message).toEqual(message);
    });
  });

  describe('setCanceled', () => {
    it('should transition to canceled state from submitted', () => {
      manager.create({ id: 'task-1' });
      const task = manager.setCanceled('task-1');

      expect(task.status.state).toBe('canceled');
    });

    it('should transition to canceled state from working', () => {
      manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const task = manager.setCanceled('task-1');

      expect(task.status.state).toBe('canceled');
    });
  });

  describe('setInputRequired', () => {
    it('should transition to input-required state', () => {
      manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const task = manager.setInputRequired('task-1');

      expect(task.status.state).toBe('input-required');
    });

    it('should include input request message', () => {
      manager.create({ id: 'task-1' });
      manager.setWorking('task-1');
      const message: Message = {
        role: 'agent',
        parts: [{ type: 'text', text: 'Please provide more info' }],
      };
      const task = manager.setInputRequired('task-1', message);

      expect(task.status.message).toEqual(message);
    });
  });

  describe('appendHistory', () => {
    it('should append message to task history', () => {
      manager.create({ id: 'task-1' });
      const message: Message = {
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      };
      const task = manager.appendHistory('task-1', message);

      expect(task.history).toHaveLength(1);
      expect(task.history?.[0]).toEqual(message);
    });

    it('should append multiple messages', () => {
      manager.create({ id: 'task-1' });
      const msg1: Message = { role: 'user', parts: [{ type: 'text', text: 'Hello' }] };
      const msg2: Message = { role: 'agent', parts: [{ type: 'text', text: 'Hi!' }] };

      manager.appendHistory('task-1', msg1);
      const task = manager.appendHistory('task-1', msg2);

      expect(task.history).toHaveLength(2);
      expect(task.history?.[0]).toEqual(msg1);
      expect(task.history?.[1]).toEqual(msg2);
    });

    it('should throw TaskNotFoundError for non-existent task', () => {
      const message: Message = {
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      };

      expect(() => manager.appendHistory('non-existent', message)).toThrow(
        TaskNotFoundError
      );
    });
  });

  describe('addArtifact', () => {
    it('should add artifact to task', () => {
      manager.create({ id: 'task-1' });
      const artifact: Artifact = {
        name: 'result',
        parts: [{ type: 'text', text: 'Result data' }],
      };
      const task = manager.addArtifact('task-1', artifact);

      expect(task.artifacts).toHaveLength(1);
      expect(task.artifacts?.[0]).toEqual(artifact);
    });

    it('should add multiple artifacts', () => {
      manager.create({ id: 'task-1' });
      const artifact1: Artifact = {
        name: 'result1',
        parts: [{ type: 'text', text: 'Data 1' }],
      };
      const artifact2: Artifact = {
        name: 'result2',
        parts: [{ type: 'data', data: { key: 'value' } }],
      };

      manager.addArtifact('task-1', artifact1);
      const task = manager.addArtifact('task-1', artifact2);

      expect(task.artifacts).toHaveLength(2);
    });

    it('should throw TaskNotFoundError for non-existent task', () => {
      const artifact: Artifact = {
        parts: [{ type: 'text', text: 'Data' }],
      };

      expect(() => manager.addArtifact('non-existent', artifact)).toThrow(
        TaskNotFoundError
      );
    });
  });

  describe('updateArtifact', () => {
    it('should append text to existing artifact', () => {
      manager.create({ id: 'task-1' });
      manager.addArtifact('task-1', {
        parts: [{ type: 'text', text: 'Hello' }],
      });
      const task = manager.updateArtifact('task-1', 0, {
        append: true,
        parts: [{ type: 'text', text: ' World' }],
      });

      expect(task.artifacts?.[0]?.parts[0]).toEqual({
        type: 'text',
        text: 'Hello World',
      });
    });

    it('should add new artifact if index exceeds current count', () => {
      manager.create({ id: 'task-1' });
      const task = manager.updateArtifact('task-1', 0, {
        parts: [{ type: 'text', text: 'New artifact' }],
      });

      expect(task.artifacts).toHaveLength(1);
    });

    it('should update lastChunk property', () => {
      manager.create({ id: 'task-1' });
      manager.addArtifact('task-1', {
        parts: [{ type: 'text', text: 'Data' }],
      });
      const task = manager.updateArtifact('task-1', 0, {
        lastChunk: true,
        parts: [],
      });

      expect(task.artifacts?.[0]?.lastChunk).toBe(true);
    });

    it('should add non-text parts to existing artifact', () => {
      manager.create({ id: 'task-1' });
      manager.addArtifact('task-1', {
        parts: [{ type: 'text', text: 'Hello' }],
      });
      const task = manager.updateArtifact('task-1', 0, {
        append: true,
        parts: [{ type: 'data', data: { key: 'value' } }],
      });

      expect(task.artifacts?.[0]?.parts).toHaveLength(2);
      expect(task.artifacts?.[0]?.parts[1]).toEqual({
        type: 'data',
        data: { key: 'value' },
      });
    });

    it('should handle append with different part types', () => {
      manager.create({ id: 'task-1' });
      manager.addArtifact('task-1', {
        parts: [{ type: 'data', data: { initial: true } }],
      });
      const task = manager.updateArtifact('task-1', 0, {
        append: true,
        parts: [{ type: 'text', text: 'New text' }],
      });

      expect(task.artifacts?.[0]?.parts).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete existing task', () => {
      manager.create({ id: 'task-1' });

      expect(manager.delete('task-1')).toBe(true);
      expect(manager.has('task-1')).toBe(false);
    });

    it('should return false for non-existent task', () => {
      expect(manager.delete('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all tasks', () => {
      manager.create({ id: 'task-1' });
      manager.create({ id: 'task-2' });
      manager.create({ id: 'task-3' });

      manager.clear();

      expect(manager.size).toBe(0);
    });
  });

  describe('keys', () => {
    it('should return all task IDs', () => {
      manager.create({ id: 'task-1' });
      manager.create({ id: 'task-2' });

      const keys = manager.keys();

      expect(keys).toContain('task-1');
      expect(keys).toContain('task-2');
      expect(keys).toHaveLength(2);
    });

    it('should return empty array when no tasks', () => {
      expect(manager.keys()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return task count', () => {
      expect(manager.size).toBe(0);

      manager.create({ id: 'task-1' });
      expect(manager.size).toBe(1);

      manager.create({ id: 'task-2' });
      expect(manager.size).toBe(2);

      manager.delete('task-1');
      expect(manager.size).toBe(1);
    });
  });
});
