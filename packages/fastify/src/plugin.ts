/**
 * Fastify plugin for A2A protocol
 */

import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
  FastifyInstance,
} from 'fastify';
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
 * Options for the A2A Fastify plugin
 */
export interface A2AFastifyOptions {
  /** Prefix path for routes */
  prefix?: string;
}

/**
 * Create a Fastify plugin for an A2A agent
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { createA2APlugin } from '@a2akit/fastify';
 *
 * @A2AAgent({ name: 'My Agent', description: '...', version: '1.0.0' })
 * class MyAgent {
 *   @Skill({ name: 'Hello', description: 'Say hello' })
 *   async hello(@TextPart() name: string) {
 *     return `Hello, ${name}!`;
 *   }
 * }
 *
 * const fastify = Fastify();
 * fastify.register(createA2APlugin(MyAgent), { prefix: '/a2a' });
 * fastify.listen({ port: 3000 });
 * ```
 */
export function createA2APlugin(
  agentClass: new (...args: unknown[]) => unknown
): FastifyPluginAsync<A2AFastifyOptions> {
  return async function a2aPlugin(
    fastify: FastifyInstance,
    options: A2AFastifyOptions
  ): Promise<void> {
    const prefix = options.prefix ?? '';

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
    fastify.get('/.well-known/agent.json', async (request, _reply) => {
      const baseUrl = `${request.protocol}://${request.hostname}${prefix}`;
      const card = generateAgentCard(agentClass, { baseUrl });
      return card;
    });

    // JSON-RPC endpoint
    fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
      const jsonRpcRequest = request.body as JsonRpcRequest;

      // Validate JSON-RPC structure
      if (
        !jsonRpcRequest ||
        jsonRpcRequest.jsonrpc !== '2.0' ||
        typeof jsonRpcRequest.method !== 'string'
      ) {
        return createErrorResponse(
          jsonRpcRequest?.id ?? null,
          JsonRpcErrorCodes.INVALID_REQUEST,
          'Invalid JSON-RPC request'
        );
      }

      // Handle streaming request
      if (jsonRpcRequest.method === A2AMethods.TASKS_SEND_SUBSCRIBE) {
        // Get raw response for SSE - SSEWriter will set headers
        const raw = reply.raw as ServerResponse;
        const sse = new SSEWriter(raw);

        await handleStreamingRequest(
          jsonRpcRequest.params as SendParams,
          taskManager,
          invoker,
          sse,
          jsonRpcRequest.id
        );

        // Mark as sent so Fastify doesn't try to send response
        reply.hijack();
        return;
      }

      // Handle regular JSON-RPC request
      return rpcRouter.handle(jsonRpcRequest);
    });

    // Decorate fastify with task manager access
    fastify.decorate('a2aTaskManager', taskManager);
  };
}

/**
 * TypeScript declaration merging for Fastify
 */
declare module 'fastify' {
  interface FastifyInstance {
    a2aTaskManager?: TaskManager;
  }
}
