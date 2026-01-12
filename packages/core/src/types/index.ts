/**
 * Type exports for @a2akit/core
 */

// Protocol types
export type {
  TaskState,
  TextPart,
  FilePart,
  DataPart,
  Part,
  FileContent,
  Message,
  MessageRole,
  TaskStatus,
  Artifact,
  Task,
} from './protocol.js';

export {
  isTextPart,
  isFilePart,
  isDataPart,
  isTerminalState,
} from './protocol.js';

// Agent Card types
export type {
  Skill,
  Capabilities,
  Provider,
  AuthenticationScheme,
  AuthenticationConfig,
  AgentInterface,
  AgentCard,
  AgentCardOptions,
} from './agent-card.js';

// JSON-RPC types
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
} from './jsonrpc.js';

export {
  JsonRpcErrorCodes,
  A2AErrorCodes,
  A2AMethods,
  createSuccessResponse,
  createErrorResponse,
} from './jsonrpc.js';
