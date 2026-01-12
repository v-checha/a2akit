/**
 * A2A HTTP Server
 * Built-in HTTP server using node:http
 */

import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { JsonRpcRequest } from '../types/jsonrpc.js';
import { JsonRpcErrorCodes, createErrorResponse } from '../types/jsonrpc.js';
import { generateAgentCard } from '../card/generator.js';
import { TaskManager } from '../task/manager.js';
import { JsonRpcRouter } from './router.js';
import { SkillInvoker } from './invoker.js';
import { SSEWriter } from './sse.js';
import { createHandlers, type SendParams } from './handlers.js';
import { handleStreamingRequest } from './streaming-handler.js';
import { A2AMethods } from '../types/jsonrpc.js';

/**
 * Server options
 */
export interface A2AServerOptions {
  /** Port to listen on (default: 3000) */
  port?: number;
  /** Host to bind to (default: localhost) */
  host?: string;
  /** Base path for routes (default: /) */
  basePath?: string;
}

/**
 * A2A Server using built-in node:http
 */
export class A2AServer {
  private server: Server | null = null;
  private router: JsonRpcRouter;
  private taskManager: TaskManager;
  private invoker: SkillInvoker;
  private agentClass: new (...args: unknown[]) => unknown;
  private options: Required<A2AServerOptions>;

  constructor(
    agentClass: new (...args: unknown[]) => unknown,
    options: A2AServerOptions = {}
  ) {
    this.agentClass = agentClass;
    this.options = {
      port: options.port ?? 3000,
      host: options.host ?? 'localhost',
      basePath: options.basePath ?? '',
    };

    // Create agent instance
    const agentInstance = new agentClass();

    // Initialize components
    this.taskManager = new TaskManager();
    this.invoker = new SkillInvoker(agentInstance as object, agentClass);
    this.router = new JsonRpcRouter();

    // Register handlers
    const handlers = createHandlers({
      taskManager: this.taskManager,
      invoker: this.invoker,
    });

    for (const [method, handler] of Object.entries(handlers)) {
      this.router.register(method, handler);
    }
  }

  /**
   * Get the base URL for the server
   */
  getBaseUrl(): string {
    const { host, port, basePath } = this.options;
    return `http://${host}:${port}${basePath}`;
  }

  /**
   * Start the server
   */
  listen(port?: number, host?: string): Promise<void> {
    if (port !== undefined) this.options.port = port;
    if (host !== undefined) this.options.host = host;

    return new Promise((resolve, reject) => {
      this.server = createServer(this.handleRequest.bind(this));

      this.server.on('error', reject);

      this.server.listen(this.options.port, this.options.host, () => {
        console.log(`A2A server running at ${this.getBaseUrl()}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get the TaskManager instance
   */
  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const { basePath } = this.options;

    // Remove base path from pathname for matching
    let pathname = url.pathname;
    if (basePath && pathname.startsWith(basePath)) {
      pathname = pathname.slice(basePath.length) || '/';
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Agent Card endpoint
      if (pathname === '/.well-known/agent.json' && req.method === 'GET') {
        await this.handleAgentCard(res);
        return;
      }

      // JSON-RPC endpoint
      if (pathname === '/' && req.method === 'POST') {
        await this.handleJsonRpc(req, res);
        return;
      }

      // 404 for unknown routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }

  /**
   * Handle Agent Card request
   */
  private async handleAgentCard(res: ServerResponse): Promise<void> {
    const card = generateAgentCard(this.agentClass, {
      baseUrl: this.getBaseUrl(),
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(card, null, 2));
  }

  /**
   * Handle JSON-RPC request
   */
  private async handleJsonRpc(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // Read request body
    const body = await this.readBody(req);

    let request: JsonRpcRequest;
    try {
      request = JSON.parse(body);
    } catch {
      const errorResponse = createErrorResponse(
        null,
        JsonRpcErrorCodes.PARSE_ERROR,
        'Parse error'
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(errorResponse));
      return;
    }

    // Check for streaming request
    if (request.method === A2AMethods.TASKS_SEND_SUBSCRIBE) {
      const sse = new SSEWriter(res);
      await handleStreamingRequest(
        request.params as SendParams,
        this.taskManager,
        this.invoker,
        sse,
        request.id
      );
      return;
    }

    // Handle regular JSON-RPC request
    const response = await this.router.handle(request);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Read request body
   */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }
}
