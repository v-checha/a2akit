/**
 * Task State Machine
 * Defines valid state transitions for A2A tasks
 */

import type { TaskState } from '../types/protocol.js';

/**
 * Valid state transitions map
 * Key: from state, Value: array of valid target states
 */
const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  submitted: ['working', 'canceled', 'failed'],
  working: ['completed', 'failed', 'canceled', 'input-required'],
  'input-required': ['working', 'canceled', 'failed'],
  completed: [],
  canceled: [],
  failed: [],
  unknown: ['submitted', 'working', 'completed', 'failed', 'canceled', 'input-required'],
};

/**
 * Terminal states that cannot transition to other states
 */
const TERMINAL_STATES: TaskState[] = ['completed', 'canceled', 'failed'];

/**
 * Task State Machine for validating state transitions
 */
export class TaskStateMachine {
  /**
   * Check if a state transition is valid
   */
  canTransition(from: TaskState, to: TaskState): boolean {
    const validTargets = VALID_TRANSITIONS[from];
    return validTargets?.includes(to) ?? false;
  }

  /**
   * Assert that a state transition is valid
   * @throws Error if transition is invalid
   */
  assertTransition(from: TaskState, to: TaskState): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid state transition: ${from} -> ${to}`);
    }
  }

  /**
   * Check if a state is terminal (no further transitions allowed)
   */
  isTerminal(state: TaskState): boolean {
    return TERMINAL_STATES.includes(state);
  }

  /**
   * Get all valid target states from a given state
   */
  getValidTransitions(from: TaskState): TaskState[] {
    return [...(VALID_TRANSITIONS[from] ?? [])];
  }
}

/**
 * Singleton instance of the state machine
 */
export const taskStateMachine = new TaskStateMachine();
