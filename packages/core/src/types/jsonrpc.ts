/**
 * JSON-RPC 2.0 Types for A2A Protocol
 * @see https://www.jsonrpc.org/specification
 */

/**
 * JSON-RPC request object
 */
export interface JsonRpcRequest {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: '2.0';
  /** Request identifier */
  id: string | number;
  /** Method name to invoke */
  method: string;
  /** Method parameters */
  params?: unknown;
}

/**
 * JSON-RPC error object
 */
export interface JsonRpcError {
  /** Error code */
  code: number;
  /** Error message */
  message: string;
  /** Additional error data */
  data?: unknown;
}

/**
 * JSON-RPC response object
 */
export interface JsonRpcResponse {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: '2.0';
  /** Request identifier (matches request) */
  id: string | number | null;
  /** Result on success */
  result?: unknown;
  /** Error on failure */
  error?: JsonRpcError;
}

/**
 * Standard JSON-RPC error codes
 */
export const JsonRpcErrorCodes = {
  /** Invalid JSON was received */
  PARSE_ERROR: -32700,
  /** Invalid request object */
  INVALID_REQUEST: -32600,
  /** Method not found */
  METHOD_NOT_FOUND: -32601,
  /** Invalid method parameters */
  INVALID_PARAMS: -32602,
  /** Internal JSON-RPC error */
  INTERNAL_ERROR: -32603,
} as const;

/**
 * A2A-specific error codes (-32000 to -32099 range)
 */
export const A2AErrorCodes = {
  /** Task with given ID not found */
  TASK_NOT_FOUND: -32001,
  /** Task cannot be canceled in current state */
  TASK_NOT_CANCELABLE: -32002,
  /** Push notifications not supported */
  PUSH_NOTIFICATION_NOT_SUPPORTED: -32003,
  /** Unsupported operation */
  UNSUPPORTED_OPERATION: -32004,
  /** Content type not supported */
  CONTENT_TYPE_NOT_SUPPORTED: -32005,
  /** Streaming not supported */
  STREAMING_NOT_SUPPORTED: -32006,
  /** Authentication required */
  AUTHENTICATION_REQUIRED: -32007,
  /** Authorization failed */
  AUTHORIZATION_FAILED: -32008,
  /** Version not supported */
  VERSION_NOT_SUPPORTED: -32009,
} as const;

/**
 * Create a JSON-RPC success response
 */
export function createSuccessResponse(
  id: string | number,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Create a JSON-RPC error response
 */
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

/**
 * A2A JSON-RPC method names
 */
export const A2AMethods = {
  /** Send a message and get immediate response */
  TASKS_SEND: 'tasks/send',
  /** Send a message and subscribe to streaming updates */
  TASKS_SEND_SUBSCRIBE: 'tasks/sendSubscribe',
  /** Get task by ID */
  TASKS_GET: 'tasks/get',
  /** Cancel a task */
  TASKS_CANCEL: 'tasks/cancel',
  /** Resubscribe to task updates */
  TASKS_RESUBSCRIBE: 'tasks/resubscribe',
  /** Set push notification config */
  TASKS_PUSH_NOTIFICATION_SET: 'tasks/pushNotification/set',
  /** Get push notification config */
  TASKS_PUSH_NOTIFICATION_GET: 'tasks/pushNotification/get',
} as const;
