/**
 * Server exports for @a2akit/core
 */

// HTTP Server
export { A2AServer, type A2AServerOptions } from './http.js';

// JSON-RPC Router
export { JsonRpcRouter, type MethodHandler } from './router.js';

// SSE
export {
  SSEWriter,
  createSSEHeaders,
  type TaskStatusUpdateEvent,
  type TaskArtifactUpdateEvent,
} from './sse.js';

// Skill Invoker
export { SkillInvoker, type SkillResult } from './invoker.js';

// Handlers
export {
  createSendHandler,
  createGetHandler,
  createCancelHandler,
  createHandlers,
  type SendParams,
  type GetParams,
  type CancelParams,
  type HandlerContext,
} from './handlers.js';

// Streaming Handler
export { handleStreamingRequest } from './streaming-handler.js';
