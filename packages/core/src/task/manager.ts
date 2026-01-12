/**
 * Task Manager
 * In-memory task storage and lifecycle management
 */

import type {
  Task,
  TaskState,
  TaskStatus,
  Message,
  Artifact,
} from '../types/protocol.js';
import { TaskNotFoundError, InvalidStateTransitionError } from '../errors/index.js';
import { taskStateMachine } from './state-machine.js';

/**
 * Options for creating a new task
 */
export interface CreateTaskOptions {
  /** Task ID (required) */
  id: string;
  /** Context/session ID */
  contextId?: string;
  /** Initial metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Task Manager for in-memory task storage
 */
export class TaskManager {
  private tasks = new Map<string, Task>();

  /**
   * Create a new task in submitted state
   */
  create(options: CreateTaskOptions): Task {
    const { id, contextId, metadata } = options;

    if (this.tasks.has(id)) {
      return this.tasks.get(id)!;
    }

    const task: Task = {
      id,
      contextId,
      status: {
        state: 'submitted',
        timestamp: new Date().toISOString(),
      },
      history: [],
      artifacts: [],
      metadata,
    };

    this.tasks.set(id, task);
    return task;
  }

  /**
   * Get a task by ID
   */
  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get a task by ID or throw if not found
   */
  getOrThrow(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new TaskNotFoundError(id);
    }
    return task;
  }

  /**
   * Check if a task exists
   */
  has(id: string): boolean {
    return this.tasks.has(id);
  }

  /**
   * Update task status with state transition validation
   */
  updateStatus(id: string, state: TaskState, statusMessage?: Message): Task {
    const task = this.getOrThrow(id);
    const currentState = task.status.state;

    if (!taskStateMachine.canTransition(currentState, state)) {
      throw new InvalidStateTransitionError(id, currentState, state);
    }

    const newStatus: TaskStatus = {
      state,
      timestamp: new Date().toISOString(),
    };

    if (statusMessage) {
      newStatus.message = statusMessage;
    }

    task.status = newStatus;
    return task;
  }

  /**
   * Transition to working state
   */
  setWorking(id: string): Task {
    return this.updateStatus(id, 'working');
  }

  /**
   * Transition to completed state
   */
  setCompleted(id: string, message?: Message): Task {
    return this.updateStatus(id, 'completed', message);
  }

  /**
   * Transition to failed state
   */
  setFailed(id: string, message?: Message): Task {
    return this.updateStatus(id, 'failed', message);
  }

  /**
   * Transition to canceled state
   */
  setCanceled(id: string): Task {
    return this.updateStatus(id, 'canceled');
  }

  /**
   * Transition to input-required state
   */
  setInputRequired(id: string, message?: Message): Task {
    return this.updateStatus(id, 'input-required', message);
  }

  /**
   * Append a message to task history
   */
  appendHistory(id: string, message: Message): Task {
    const task = this.getOrThrow(id);
    task.history = task.history ?? [];
    task.history.push(message);
    return task;
  }

  /**
   * Add an artifact to the task
   */
  addArtifact(id: string, artifact: Artifact): Task {
    const task = this.getOrThrow(id);
    task.artifacts = task.artifacts ?? [];
    task.artifacts.push(artifact);
    return task;
  }

  /**
   * Update or append an artifact (for streaming)
   */
  updateArtifact(id: string, artifactIndex: number, artifact: Artifact): Task {
    const task = this.getOrThrow(id);
    task.artifacts = task.artifacts ?? [];

    if (artifactIndex < task.artifacts.length) {
      // Update existing artifact
      const existing = task.artifacts[artifactIndex]!;
      if (artifact.append && existing.parts.length > 0) {
        // Append to last part if it's the same type
        const lastPart = existing.parts[existing.parts.length - 1]!;
        const newPart = artifact.parts[0];
        if (newPart && lastPart.type === 'text' && newPart.type === 'text') {
          lastPart.text += newPart.text;
        } else if (newPart) {
          existing.parts.push(newPart);
        }
      }
      if (artifact.lastChunk !== undefined) {
        existing.lastChunk = artifact.lastChunk;
      }
    } else {
      // Add new artifact
      task.artifacts.push(artifact);
    }

    return task;
  }

  /**
   * Delete a task
   */
  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
  }

  /**
   * Get all task IDs
   */
  keys(): string[] {
    return [...this.tasks.keys()];
  }

  /**
   * Get task count
   */
  get size(): number {
    return this.tasks.size;
  }
}
