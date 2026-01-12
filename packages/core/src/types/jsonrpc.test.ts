import { describe, it, expect } from 'vitest';
import {
  createSuccessResponse,
  createErrorResponse,
  JsonRpcErrorCodes,
  A2AErrorCodes,
  A2AMethods,
  type JsonRpcResponse,
} from './jsonrpc.js';

describe('createSuccessResponse', () => {
  it('should create a success response with string id', () => {
    const response = createSuccessResponse('1', { data: 'test' });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe('1');
    expect(response.result).toEqual({ data: 'test' });
    expect(response.error).toBeUndefined();
  });

  it('should create a success response with number id', () => {
    const response = createSuccessResponse(42, 'result');

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(42);
    expect(response.result).toBe('result');
  });

  it('should handle null result', () => {
    const response = createSuccessResponse('1', null);

    expect(response.result).toBeNull();
  });

  it('should handle complex result objects', () => {
    const result = {
      task: { id: 'task-1', status: { state: 'completed' } },
      artifacts: [{ parts: [{ type: 'text', text: 'Hello' }] }],
    };
    const response = createSuccessResponse('1', result);

    expect(response.result).toEqual(result);
  });
});

describe('createErrorResponse', () => {
  it('should create an error response with string id', () => {
    const response = createErrorResponse('1', -32600, 'Invalid Request');

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe('1');
    expect(response.result).toBeUndefined();
    expect(response.error).toEqual({
      code: -32600,
      message: 'Invalid Request',
    });
  });

  it('should create an error response with number id', () => {
    const response = createErrorResponse(42, -32601, 'Method not found');

    expect(response.id).toBe(42);
    expect(response.error?.code).toBe(-32601);
  });

  it('should create an error response with null id', () => {
    const response = createErrorResponse(null, -32700, 'Parse error');

    expect(response.id).toBeNull();
    expect(response.error?.code).toBe(-32700);
  });

  it('should include error data when provided', () => {
    const response = createErrorResponse(
      '1',
      -32602,
      'Invalid params',
      { field: 'message.role', expected: 'user | agent' }
    );

    expect(response.error?.data).toEqual({
      field: 'message.role',
      expected: 'user | agent',
    });
  });

  it('should handle undefined data', () => {
    const response = createErrorResponse('1', -32603, 'Internal error', undefined);

    expect(response.error?.data).toBeUndefined();
  });
});

describe('JsonRpcErrorCodes', () => {
  it('should have correct standard JSON-RPC error codes', () => {
    expect(JsonRpcErrorCodes.PARSE_ERROR).toBe(-32700);
    expect(JsonRpcErrorCodes.INVALID_REQUEST).toBe(-32600);
    expect(JsonRpcErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
    expect(JsonRpcErrorCodes.INVALID_PARAMS).toBe(-32602);
    expect(JsonRpcErrorCodes.INTERNAL_ERROR).toBe(-32603);
  });

  it('should be immutable (const)', () => {
    // TypeScript const assertion ensures this at compile time
    // Runtime check that values exist
    expect(Object.keys(JsonRpcErrorCodes)).toHaveLength(5);
  });
});

describe('A2AErrorCodes', () => {
  it('should have correct A2A-specific error codes', () => {
    expect(A2AErrorCodes.TASK_NOT_FOUND).toBe(-32001);
    expect(A2AErrorCodes.TASK_NOT_CANCELABLE).toBe(-32002);
    expect(A2AErrorCodes.PUSH_NOTIFICATION_NOT_SUPPORTED).toBe(-32003);
    expect(A2AErrorCodes.UNSUPPORTED_OPERATION).toBe(-32004);
    expect(A2AErrorCodes.CONTENT_TYPE_NOT_SUPPORTED).toBe(-32005);
    expect(A2AErrorCodes.STREAMING_NOT_SUPPORTED).toBe(-32006);
    expect(A2AErrorCodes.AUTHENTICATION_REQUIRED).toBe(-32007);
    expect(A2AErrorCodes.AUTHORIZATION_FAILED).toBe(-32008);
    expect(A2AErrorCodes.VERSION_NOT_SUPPORTED).toBe(-32009);
  });

  it('should be in the reserved range (-32000 to -32099)', () => {
    for (const code of Object.values(A2AErrorCodes)) {
      expect(code).toBeGreaterThanOrEqual(-32099);
      expect(code).toBeLessThanOrEqual(-32000);
    }
  });
});

describe('A2AMethods', () => {
  it('should have correct method names', () => {
    expect(A2AMethods.TASKS_SEND).toBe('tasks/send');
    expect(A2AMethods.TASKS_SEND_SUBSCRIBE).toBe('tasks/sendSubscribe');
    expect(A2AMethods.TASKS_GET).toBe('tasks/get');
    expect(A2AMethods.TASKS_CANCEL).toBe('tasks/cancel');
    expect(A2AMethods.TASKS_RESUBSCRIBE).toBe('tasks/resubscribe');
    expect(A2AMethods.TASKS_PUSH_NOTIFICATION_SET).toBe('tasks/pushNotification/set');
    expect(A2AMethods.TASKS_PUSH_NOTIFICATION_GET).toBe('tasks/pushNotification/get');
  });

  it('should use tasks/ prefix for all methods', () => {
    for (const method of Object.values(A2AMethods)) {
      expect(method.startsWith('tasks/')).toBe(true);
    }
  });
});
