/**
 * JSON-RPC Router
 * Routes JSON-RPC requests to appropriate handlers
 */

import type { JsonRpcRequest, JsonRpcResponse } from '../types/jsonrpc.js';
import {
  createSuccessResponse,
  createErrorResponse,
  JsonRpcErrorCodes,
} from '../types/jsonrpc.js';
import { toA2AError } from '../errors/index.js';

/**
 * Handler function type for JSON-RPC methods
 */
export type MethodHandler<TParams = unknown, TResult = unknown> = (
  params: TParams
) => Promise<TResult>;

/**
 * JSON-RPC Router for dispatching requests to handlers
 */
export class JsonRpcRouter {
  private handlers = new Map<string, MethodHandler>();

  /**
   * Register a handler for a method
   */
  register<TParams = unknown, TResult = unknown>(
    method: string,
    handler: MethodHandler<TParams, TResult>
  ): void {
    this.handlers.set(method, handler as MethodHandler);
  }

  /**
   * Unregister a handler
   */
  unregister(method: string): boolean {
    return this.handlers.delete(method);
  }

  /**
   * Check if a method is registered
   */
  hasMethod(method: string): boolean {
    return this.handlers.has(method);
  }

  /**
   * Get all registered method names
   */
  getMethods(): string[] {
    return [...this.handlers.keys()];
  }

  /**
   * Handle a JSON-RPC request
   */
  async handle(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    // Validate request structure
    if (request.jsonrpc !== '2.0') {
      return createErrorResponse(
        request.id ?? null,
        JsonRpcErrorCodes.INVALID_REQUEST,
        'Invalid JSON-RPC version'
      );
    }

    if (typeof request.method !== 'string') {
      return createErrorResponse(
        request.id ?? null,
        JsonRpcErrorCodes.INVALID_REQUEST,
        'Method must be a string'
      );
    }

    // Find handler
    const handler = this.handlers.get(request.method);

    if (!handler) {
      return createErrorResponse(
        request.id,
        JsonRpcErrorCodes.METHOD_NOT_FOUND,
        `Method not found: ${request.method}`
      );
    }

    // Execute handler
    try {
      const result = await handler(request.params);
      return createSuccessResponse(request.id, result);
    } catch (error) {
      const a2aError = toA2AError(error);
      return createErrorResponse(
        request.id,
        a2aError.code,
        a2aError.message,
        a2aError.data
      );
    }
  }

  /**
   * Handle a batch of JSON-RPC requests
   */
  async handleBatch(requests: JsonRpcRequest[]): Promise<JsonRpcResponse[]> {
    return Promise.all(requests.map(req => this.handle(req)));
  }
}
