/**
 * Express middleware for A2A protocol
 */

import type { Router, Request, Response, NextFunction } from 'express';
import { Router as createRouter } from 'express';
import type { ServerResponse } from 'node:http';
import {
  generateAgentCard,
  TaskManager,
  JsonRpcRouter,
  SkillInvoker,
  SSEWriter,
  createHandlers,
  handleStreamingRequest,
  A2AMethods,
  JsonRpcErrorCodes,
  createErrorResponse,
  type JsonRpcRequest,
  type SendParams,
} from '@a2akit/core';

/**
 * Options for creating the A2A router
 */
export interface A2AExpressOptions {
  /** Base path for URL construction in Agent Card */
  basePath?: string;
}

/**
 * Create an Express router with A2A endpoints
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createA2ARouter } from '@a2akit/express';
 *
 * @A2AAgent({ name: 'My Agent', description: '...', version: '1.0.0' })
 * class MyAgent {
 *   @skill({ name: 'Hello', description: 'Say hello' })
 *   async hello(@textPart() name: string) {
 *     return `Hello, ${name}!`;
 *   }
 * }
 *
 * const app = express();
 * app.use(express.json());
 * app.use('/a2a', createA2ARouter(MyAgent));
 * app.listen(3000);
 * ```
 */
export function createA2ARouter(
  agentClass: new (...args: unknown[]) => unknown,
  options: A2AExpressOptions = {}
): Router {
  const router = createRouter();
  const basePath = options.basePath ?? '';

  // Create agent instance and components
  const agentInstance = new agentClass();
  const taskManager = new TaskManager();
  const rpcRouter = new JsonRpcRouter();
  const invoker = new SkillInvoker(agentInstance as object, agentClass);

  // Register JSON-RPC handlers
  const handlers = createHandlers({ taskManager, invoker });
  for (const [method, handler] of Object.entries(handlers)) {
    rpcRouter.register(method, handler);
  }

  // Agent Card endpoint
  router.get('/.well-known/agent.json', (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}${basePath}`;
    const card = generateAgentCard(agentClass, { baseUrl });
    res.json(card);
  });

  // JSON-RPC endpoint
  router.post('/', async (req: Request, res: Response) => {
    const request = req.body as JsonRpcRequest;

    // Validate JSON-RPC structure
    if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
      const errorResponse = createErrorResponse(
        request?.id ?? null,
        JsonRpcErrorCodes.INVALID_REQUEST,
        'Invalid JSON-RPC request'
      );
      res.json(errorResponse);
      return;
    }

    // Handle streaming request
    if (request.method === A2AMethods.TASKS_SEND_SUBSCRIBE) {
      // SSEWriter will set the appropriate headers
      const sse = new SSEWriter(res as unknown as ServerResponse);
      await handleStreamingRequest(
        request.params as SendParams,
        taskManager,
        invoker,
        sse,
        request.id
      );
      return;
    }

    // Handle regular JSON-RPC request
    const response = await rpcRouter.handle(request);
    res.json(response);
  });

  return router;
}

/**
 * Create A2A middleware that can be mounted on any path
 * This is an alias for createA2ARouter for semantic clarity
 */
export const createA2AMiddleware = createA2ARouter;

/**
 * Express error handler for A2A errors
 */
export function a2aErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    return next(err);
  }

  console.error('A2A Error:', err);

  res.status(500).json({
    jsonrpc: '2.0',
    id: null,
    error: {
      code: -32603,
      message: err.message || 'Internal Server Error',
    },
  });
}
