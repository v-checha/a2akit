import { describe, it, expect } from 'vitest';
import { TaskStateMachine, taskStateMachine } from './state-machine.js';
import type { TaskState } from '../types/protocol.js';

describe('TaskStateMachine', () => {
  describe('canTransition', () => {
    it('should allow submitted -> working', () => {
      expect(taskStateMachine.canTransition('submitted', 'working')).toBe(true);
    });

    it('should allow submitted -> canceled', () => {
      expect(taskStateMachine.canTransition('submitted', 'canceled')).toBe(true);
    });

    it('should allow submitted -> failed', () => {
      expect(taskStateMachine.canTransition('submitted', 'failed')).toBe(true);
    });

    it('should not allow submitted -> completed', () => {
      expect(taskStateMachine.canTransition('submitted', 'completed')).toBe(false);
    });

    it('should allow working -> completed', () => {
      expect(taskStateMachine.canTransition('working', 'completed')).toBe(true);
    });

    it('should allow working -> failed', () => {
      expect(taskStateMachine.canTransition('working', 'failed')).toBe(true);
    });

    it('should allow working -> canceled', () => {
      expect(taskStateMachine.canTransition('working', 'canceled')).toBe(true);
    });

    it('should allow working -> input-required', () => {
      expect(taskStateMachine.canTransition('working', 'input-required')).toBe(true);
    });

    it('should allow input-required -> working', () => {
      expect(taskStateMachine.canTransition('input-required', 'working')).toBe(true);
    });

    it('should allow input-required -> canceled', () => {
      expect(taskStateMachine.canTransition('input-required', 'canceled')).toBe(true);
    });

    it('should allow input-required -> failed', () => {
      expect(taskStateMachine.canTransition('input-required', 'failed')).toBe(true);
    });

    it('should not allow completed -> any other state', () => {
      const states: TaskState[] = ['submitted', 'working', 'input-required', 'canceled', 'failed', 'unknown'];
      for (const state of states) {
        expect(taskStateMachine.canTransition('completed', state)).toBe(false);
      }
    });

    it('should not allow canceled -> any other state', () => {
      const states: TaskState[] = ['submitted', 'working', 'input-required', 'completed', 'failed', 'unknown'];
      for (const state of states) {
        expect(taskStateMachine.canTransition('canceled', state)).toBe(false);
      }
    });

    it('should not allow failed -> any other state', () => {
      const states: TaskState[] = ['submitted', 'working', 'input-required', 'completed', 'canceled', 'unknown'];
      for (const state of states) {
        expect(taskStateMachine.canTransition('failed', state)).toBe(false);
      }
    });

    it('should allow unknown -> any non-unknown state', () => {
      const states: TaskState[] = ['submitted', 'working', 'input-required', 'completed', 'canceled', 'failed'];
      for (const state of states) {
        expect(taskStateMachine.canTransition('unknown', state)).toBe(true);
      }
    });
  });

  describe('assertTransition', () => {
    it('should not throw for valid transitions', () => {
      expect(() => taskStateMachine.assertTransition('submitted', 'working')).not.toThrow();
      expect(() => taskStateMachine.assertTransition('working', 'completed')).not.toThrow();
    });

    it('should throw for invalid transitions', () => {
      expect(() => taskStateMachine.assertTransition('submitted', 'completed')).toThrow(
        'Invalid state transition: submitted -> completed'
      );
    });

    it('should throw for terminal state transitions', () => {
      expect(() => taskStateMachine.assertTransition('completed', 'working')).toThrow(
        'Invalid state transition: completed -> working'
      );
    });
  });

  describe('isTerminal', () => {
    it('should return true for completed', () => {
      expect(taskStateMachine.isTerminal('completed')).toBe(true);
    });

    it('should return true for canceled', () => {
      expect(taskStateMachine.isTerminal('canceled')).toBe(true);
    });

    it('should return true for failed', () => {
      expect(taskStateMachine.isTerminal('failed')).toBe(true);
    });

    it('should return false for submitted', () => {
      expect(taskStateMachine.isTerminal('submitted')).toBe(false);
    });

    it('should return false for working', () => {
      expect(taskStateMachine.isTerminal('working')).toBe(false);
    });

    it('should return false for input-required', () => {
      expect(taskStateMachine.isTerminal('input-required')).toBe(false);
    });

    it('should return false for unknown', () => {
      expect(taskStateMachine.isTerminal('unknown')).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions from submitted', () => {
      const transitions = taskStateMachine.getValidTransitions('submitted');
      expect(transitions).toEqual(['working', 'canceled', 'failed']);
    });

    it('should return valid transitions from working', () => {
      const transitions = taskStateMachine.getValidTransitions('working');
      expect(transitions).toEqual(['completed', 'failed', 'canceled', 'input-required']);
    });

    it('should return valid transitions from input-required', () => {
      const transitions = taskStateMachine.getValidTransitions('input-required');
      expect(transitions).toEqual(['working', 'canceled', 'failed']);
    });

    it('should return empty array from completed', () => {
      const transitions = taskStateMachine.getValidTransitions('completed');
      expect(transitions).toEqual([]);
    });

    it('should return empty array from canceled', () => {
      const transitions = taskStateMachine.getValidTransitions('canceled');
      expect(transitions).toEqual([]);
    });

    it('should return empty array from failed', () => {
      const transitions = taskStateMachine.getValidTransitions('failed');
      expect(transitions).toEqual([]);
    });

    it('should return all non-unknown states from unknown', () => {
      const transitions = taskStateMachine.getValidTransitions('unknown');
      expect(transitions).toContain('submitted');
      expect(transitions).toContain('working');
      expect(transitions).toContain('completed');
      expect(transitions).toContain('failed');
      expect(transitions).toContain('canceled');
      expect(transitions).toContain('input-required');
    });

    it('should return a copy of the transitions array', () => {
      const transitions1 = taskStateMachine.getValidTransitions('submitted');
      const transitions2 = taskStateMachine.getValidTransitions('submitted');
      expect(transitions1).not.toBe(transitions2);
      expect(transitions1).toEqual(transitions2);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(taskStateMachine).toBeInstanceOf(TaskStateMachine);
    });
  });
});
