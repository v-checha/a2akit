/**
 * @a2akit/core
 * A TypeScript library for creating A2A protocol servers with decorators
 */

// Enable reflect-metadata
import 'reflect-metadata';

// ============================================================================
// Decorators
// ============================================================================

export {
  // Class decorator
  A2AAgent,
  type A2AAgentOptions,
  // Method decorators
  Skill,
  Streaming,
  type SkillOptions,
  // Parameter decorators
  TextPart,
  FilePart,
  DataPart,
  Message,
  TaskContext,
  Parts,
  // Metadata utilities
  getAgentMetadata,
  getSkillsMetadata,
  getParamMetadata,
  isStreamingMethod,
  type AgentMetadata,
  type SkillMetadata,
  type ParamMetadata,
  type ParamType,
} from './decorators/index.js';

// ============================================================================
// Types
// ============================================================================

export {
  // Protocol types
  type TaskState,
  type TextPart as TextPartType,
  type FilePart as FilePartType,
  type DataPart as DataPartType,
  type Part,
  type FileContent,
  type Message as MessageType,
  type MessageRole,
  type TaskStatus,
  type Artifact,
  type Task,
  // Type guards
  isTextPart,
  isFilePart,
  isDataPart,
  isTerminalState,
  // Agent Card types
  type Skill as SkillDefinition,
  type Capabilities,
  type Provider,
  type AuthenticationScheme,
  type AuthenticationConfig,
  type AgentInterface,
  type AgentCard,
  type AgentCardOptions,
  // JSON-RPC types
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcError,
  JsonRpcErrorCodes,
  A2AErrorCodes,
  A2AMethods,
  createSuccessResponse,
  createErrorResponse,
} from './types/index.js';

// ============================================================================
// Agent Card
// ============================================================================

export {
  generateAgentCard,
  getSkillIds,
  hasSkill,
  supportsStreaming,
  PROTOCOL_VERSION,
  type GenerateAgentCardOptions,
} from './card/index.js';

// ============================================================================
// Task Management
// ============================================================================

export {
  TaskStateMachine,
  taskStateMachine,
  TaskManager,
  type CreateTaskOptions,
} from './task/index.js';

// ============================================================================
// Server
// ============================================================================

export {
  A2AServer,
  type A2AServerOptions,
  JsonRpcRouter,
  type MethodHandler,
  SSEWriter,
  createSSEHeaders,
  type TaskStatusUpdateEvent,
  type TaskArtifactUpdateEvent,
  SkillInvoker,
  type SkillResult,
  createSendHandler,
  createGetHandler,
  createCancelHandler,
  createHandlers,
  type SendParams,
  type GetParams,
  type CancelParams,
  type HandlerContext,
  handleStreamingRequest,
} from './server/index.js';

// ============================================================================
// Errors
// ============================================================================

export {
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
} from './errors/index.js';

// ============================================================================
// Validation
// ============================================================================

export {
  validateMessage,
  validatePart,
  validateFileContent,
  validateTaskState,
  validateTaskId,
  isValidMessage,
  isValidPart,
} from './validation/index.js';
