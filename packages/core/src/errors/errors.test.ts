import { describe, it, expect } from 'vitest';
import {
  A2AError,
  TaskNotFoundError,
  TaskNotCancelableError,
  InvalidStateTransitionError,
  StreamingNotSupportedError,
  PushNotificationNotSupportedError,
  SkillNotFoundError,
  InvalidParamsError,
  AuthenticationRequiredError,
  AuthorizationFailedError,
  toA2AError,
} from './index.js';
import { A2AErrorCodes } from '../types/jsonrpc.js';

describe('A2AError', () => {
  it('should create error with message and code', () => {
    const error = new A2AError('Test error', -32000);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(-32000);
    expect(error.name).toBe('A2AError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should create error with data', () => {
    const error = new A2AError('Test error', -32000, { extra: 'data' });

    expect(error.data).toEqual({ extra: 'data' });
  });

  describe('toJsonRpcError', () => {
    it('should convert to JSON-RPC error format', () => {
      const error = new A2AError('Test error', -32000, { field: 'value' });
      const rpcError = error.toJsonRpcError();

      expect(rpcError).toEqual({
        code: -32000,
        message: 'Test error',
        data: { field: 'value' },
      });
    });

    it('should handle undefined data', () => {
      const error = new A2AError('Test error', -32000);
      const rpcError = error.toJsonRpcError();

      expect(rpcError.data).toBeUndefined();
    });
  });
});

describe('TaskNotFoundError', () => {
  it('should create error with task ID', () => {
    const error = new TaskNotFoundError('task-123');

    expect(error.message).toBe('Task not found: task-123');
    expect(error.code).toBe(A2AErrorCodes.TASK_NOT_FOUND);
    expect(error.data).toEqual({ taskId: 'task-123' });
    expect(error.name).toBe('TaskNotFoundError');
    expect(error).toBeInstanceOf(A2AError);
  });
});

describe('TaskNotCancelableError', () => {
  it('should create error with task ID and state', () => {
    const error = new TaskNotCancelableError('task-123', 'completed');

    expect(error.message).toBe('Task "task-123" cannot be canceled in state: completed');
    expect(error.code).toBe(A2AErrorCodes.TASK_NOT_CANCELABLE);
    expect(error.data).toEqual({ taskId: 'task-123', currentState: 'completed' });
    expect(error.name).toBe('TaskNotCancelableError');
  });
});

describe('InvalidStateTransitionError', () => {
  it('should create error with transition details', () => {
    const error = new InvalidStateTransitionError('task-123', 'submitted', 'completed');

    expect(error.message).toBe('Invalid state transition for task "task-123": submitted -> completed');
    expect(error.code).toBe(A2AErrorCodes.UNSUPPORTED_OPERATION);
    expect(error.data).toEqual({ taskId: 'task-123', from: 'submitted', to: 'completed' });
    expect(error.name).toBe('InvalidStateTransitionError');
  });
});

describe('StreamingNotSupportedError', () => {
  it('should create error with default message', () => {
    const error = new StreamingNotSupportedError();

    expect(error.message).toBe('Streaming not supported by this agent');
    expect(error.code).toBe(A2AErrorCodes.STREAMING_NOT_SUPPORTED);
    expect(error.name).toBe('StreamingNotSupportedError');
  });
});

describe('PushNotificationNotSupportedError', () => {
  it('should create error with default message', () => {
    const error = new PushNotificationNotSupportedError();

    expect(error.message).toBe('Push notifications not supported');
    expect(error.code).toBe(A2AErrorCodes.PUSH_NOTIFICATION_NOT_SUPPORTED);
    expect(error.name).toBe('PushNotificationNotSupportedError');
  });
});

describe('SkillNotFoundError', () => {
  it('should create error with skill ID', () => {
    const error = new SkillNotFoundError('unknown-skill');

    expect(error.message).toBe('Skill not found: unknown-skill');
    expect(error.code).toBe(A2AErrorCodes.UNSUPPORTED_OPERATION);
    expect(error.data).toEqual({ skillId: 'unknown-skill' });
    expect(error.name).toBe('SkillNotFoundError');
  });
});

describe('InvalidParamsError', () => {
  it('should create error with message only', () => {
    const error = new InvalidParamsError('Invalid parameter');

    expect(error.message).toBe('Invalid parameter');
    expect(error.code).toBe(-32602);
    expect(error.data).toBeUndefined();
    expect(error.name).toBe('InvalidParamsError');
  });

  it('should create error with field', () => {
    const error = new InvalidParamsError('Missing required field', 'message.role');

    expect(error.message).toBe('Missing required field');
    expect(error.data).toEqual({ field: 'message.role' });
  });
});

describe('AuthenticationRequiredError', () => {
  it('should create error with default message', () => {
    const error = new AuthenticationRequiredError();

    expect(error.message).toBe('Authentication required');
    expect(error.code).toBe(A2AErrorCodes.AUTHENTICATION_REQUIRED);
    expect(error.name).toBe('AuthenticationRequiredError');
  });

  it('should create error with custom message', () => {
    const error = new AuthenticationRequiredError('Token expired');

    expect(error.message).toBe('Token expired');
  });
});

describe('AuthorizationFailedError', () => {
  it('should create error with default message', () => {
    const error = new AuthorizationFailedError();

    expect(error.message).toBe('Authorization failed');
    expect(error.code).toBe(A2AErrorCodes.AUTHORIZATION_FAILED);
    expect(error.name).toBe('AuthorizationFailedError');
  });

  it('should create error with custom message', () => {
    const error = new AuthorizationFailedError('Insufficient permissions');

    expect(error.message).toBe('Insufficient permissions');
  });
});

describe('toA2AError', () => {
  it('should return A2AError as-is', () => {
    const original = new A2AError('Original', -32000);
    const result = toA2AError(original);

    expect(result).toBe(original);
  });

  it('should return specific A2AError subclass as-is', () => {
    const original = new TaskNotFoundError('task-1');
    const result = toA2AError(original);

    expect(result).toBe(original);
    expect(result).toBeInstanceOf(TaskNotFoundError);
  });

  it('should convert Error to A2AError', () => {
    const original = new Error('Standard error');
    const result = toA2AError(original);

    expect(result).toBeInstanceOf(A2AError);
    expect(result.message).toBe('Standard error');
    expect(result.code).toBe(-32603);
  });

  it('should convert string to A2AError', () => {
    const result = toA2AError('String error');

    expect(result).toBeInstanceOf(A2AError);
    expect(result.message).toBe('String error');
    expect(result.code).toBe(-32603);
  });

  it('should convert number to A2AError', () => {
    const result = toA2AError(42);

    expect(result.message).toBe('42');
    expect(result.code).toBe(-32603);
  });

  it('should convert null to A2AError', () => {
    const result = toA2AError(null);

    expect(result.message).toBe('null');
    expect(result.code).toBe(-32603);
  });

  it('should convert undefined to A2AError', () => {
    const result = toA2AError(undefined);

    expect(result.message).toBe('undefined');
    expect(result.code).toBe(-32603);
  });

  it('should convert object to A2AError', () => {
    const result = toA2AError({ custom: 'error' });

    expect(result.message).toBe('[object Object]');
    expect(result.code).toBe(-32603);
  });
});
