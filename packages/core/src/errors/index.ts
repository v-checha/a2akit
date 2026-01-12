/**
 * A2A Error Classes
 */

import { A2AErrorCodes, type JsonRpcError } from '../types/jsonrpc.js';
import type { TaskState } from '../types/protocol.js';

/**
 * Base class for A2A errors
 */
export class A2AError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'A2AError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Convert to JSON-RPC error format
   */
  toJsonRpcError(): JsonRpcError {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

/**
 * Task not found error
 */
export class TaskNotFoundError extends A2AError {
  constructor(taskId: string) {
    super(
      `Task not found: ${taskId}`,
      A2AErrorCodes.TASK_NOT_FOUND,
      { taskId }
    );
    this.name = 'TaskNotFoundError';
  }
}

/**
 * Task cannot be canceled error
 */
export class TaskNotCancelableError extends A2AError {
  constructor(taskId: string, currentState: TaskState) {
    super(
      `Task "${taskId}" cannot be canceled in state: ${currentState}`,
      A2AErrorCodes.TASK_NOT_CANCELABLE,
      { taskId, currentState }
    );
    this.name = 'TaskNotCancelableError';
  }
}

/**
 * Invalid state transition error
 */
export class InvalidStateTransitionError extends A2AError {
  constructor(taskId: string, from: TaskState, to: TaskState) {
    super(
      `Invalid state transition for task "${taskId}": ${from} -> ${to}`,
      A2AErrorCodes.UNSUPPORTED_OPERATION,
      { taskId, from, to }
    );
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Streaming not supported error
 */
export class StreamingNotSupportedError extends A2AError {
  constructor() {
    super(
      'Streaming not supported by this agent',
      A2AErrorCodes.STREAMING_NOT_SUPPORTED
    );
    this.name = 'StreamingNotSupportedError';
  }
}

/**
 * Push notification not supported error
 */
export class PushNotificationNotSupportedError extends A2AError {
  constructor() {
    super(
      'Push notifications not supported',
      A2AErrorCodes.PUSH_NOTIFICATION_NOT_SUPPORTED
    );
    this.name = 'PushNotificationNotSupportedError';
  }
}

/**
 * Skill not found error
 */
export class SkillNotFoundError extends A2AError {
  constructor(skillId: string) {
    super(
      `Skill not found: ${skillId}`,
      A2AErrorCodes.UNSUPPORTED_OPERATION,
      { skillId }
    );
    this.name = 'SkillNotFoundError';
  }
}

/**
 * Invalid params error
 */
export class InvalidParamsError extends A2AError {
  constructor(message: string, field?: string) {
    super(
      message,
      -32602, // JSON-RPC invalid params
      field ? { field } : undefined
    );
    this.name = 'InvalidParamsError';
  }
}

/**
 * Authentication required error
 */
export class AuthenticationRequiredError extends A2AError {
  constructor(message = 'Authentication required') {
    super(message, A2AErrorCodes.AUTHENTICATION_REQUIRED);
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Authorization failed error
 */
export class AuthorizationFailedError extends A2AError {
  constructor(message = 'Authorization failed') {
    super(message, A2AErrorCodes.AUTHORIZATION_FAILED);
    this.name = 'AuthorizationFailedError';
  }
}

/**
 * Convert any error to A2AError
 */
export function toA2AError(error: unknown): A2AError {
  if (error instanceof A2AError) {
    return error;
  }

  if (error instanceof Error) {
    return new A2AError(error.message, -32603);
  }

  return new A2AError(String(error), -32603);
}
