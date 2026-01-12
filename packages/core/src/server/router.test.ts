import { describe, it, expect, vi } from 'vitest';
import { JsonRpcRouter, type MethodHandler } from './router.js';
import { JsonRpcErrorCodes } from '../types/jsonrpc.js';
import { A2AError } from '../errors/index.js';

describe('JsonRpcRouter', () => {
  describe('register', () => {
    it('should register a handler', () => {
      const router = new JsonRpcRouter();
      const handler: MethodHandler = async () => 'result';

      router.register('test', handler);

      expect(router.hasMethod('test')).toBe(true);
    });

    it('should overwrite existing handler', () => {
      const router = new JsonRpcRouter();
      const handler1: MethodHandler = async () => 'result1';
      const handler2: MethodHandler = async () => 'result2';

      router.register('test', handler1);
      router.register('test', handler2);

      expect(router.getMethods()).toHaveLength(1);
    });
  });

  describe('unregister', () => {
    it('should remove a handler', () => {
      const router = new JsonRpcRouter();
      router.register('test', async () => 'result');

      const removed = router.unregister('test');

      expect(removed).toBe(true);
      expect(router.hasMethod('test')).toBe(false);
    });

    it('should return false for non-existent handler', () => {
      const router = new JsonRpcRouter();

      const removed = router.unregister('non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('hasMethod', () => {
    it('should return true for registered method', () => {
      const router = new JsonRpcRouter();
      router.register('test', async () => 'result');

      expect(router.hasMethod('test')).toBe(true);
    });

    it('should return false for unregistered method', () => {
      const router = new JsonRpcRouter();

      expect(router.hasMethod('non-existent')).toBe(false);
    });
  });

  describe('getMethods', () => {
    it('should return all registered methods', () => {
      const router = new JsonRpcRouter();
      router.register('method1', async () => 'result1');
      router.register('method2', async () => 'result2');

      const methods = router.getMethods();

      expect(methods).toContain('method1');
      expect(methods).toContain('method2');
      expect(methods).toHaveLength(2);
    });

    it('should return empty array when no methods registered', () => {
      const router = new JsonRpcRouter();

      expect(router.getMethods()).toEqual([]);
    });
  });

  describe('handle', () => {
    it('should route to correct handler and return success response', async () => {
      const router = new JsonRpcRouter();
      const handler = vi.fn().mockResolvedValue({ data: 'test' });
      router.register('test', handler);

      const response = await router.handle({
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
        params: { input: 'value' },
      });

      expect(handler).toHaveBeenCalledWith({ input: 'value' });
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: '1',
        result: { data: 'test' },
      });
    });

    it('should return error for invalid JSON-RPC version', async () => {
      const router = new JsonRpcRouter();

      const response = await router.handle({
        jsonrpc: '1.0' as '2.0',
        id: '1',
        method: 'test',
      });

      expect(response.error?.code).toBe(JsonRpcErrorCodes.INVALID_REQUEST);
      expect(response.error?.message).toBe('Invalid JSON-RPC version');
    });

    it('should return error for non-string method', async () => {
      const router = new JsonRpcRouter();

      const response = await router.handle({
        jsonrpc: '2.0',
        id: '1',
        method: 123 as unknown as string,
      });

      expect(response.error?.code).toBe(JsonRpcErrorCodes.INVALID_REQUEST);
      expect(response.error?.message).toBe('Method must be a string');
    });

    it('should return error for method not found', async () => {
      const router = new JsonRpcRouter();

      const response = await router.handle({
        jsonrpc: '2.0',
        id: '1',
        method: 'unknown',
      });

      expect(response.error?.code).toBe(JsonRpcErrorCodes.METHOD_NOT_FOUND);
      expect(response.error?.message).toBe('Method not found: unknown');
    });

    it('should handle A2AError from handler', async () => {
      const router = new JsonRpcRouter();
      const handler = vi.fn().mockRejectedValue(
        new A2AError('Custom error', -32001, { extra: 'data' })
      );
      router.register('test', handler);

      const response = await router.handle({
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
      });

      expect(response.error?.code).toBe(-32001);
      expect(response.error?.message).toBe('Custom error');
      expect(response.error?.data).toEqual({ extra: 'data' });
    });

    it('should convert regular Error to A2AError', async () => {
      const router = new JsonRpcRouter();
      const handler = vi.fn().mockRejectedValue(new Error('Standard error'));
      router.register('test', handler);

      const response = await router.handle({
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
      });

      expect(response.error?.code).toBe(-32603);
      expect(response.error?.message).toBe('Standard error');
    });

    it('should handle missing request id', async () => {
      const router = new JsonRpcRouter();

      const response = await router.handle({
        jsonrpc: '1.0' as '2.0',
        id: undefined as unknown as string,
        method: 'test',
      });

      expect(response.id).toBeNull();
    });

    it('should pass undefined params when not provided', async () => {
      const router = new JsonRpcRouter();
      const handler = vi.fn().mockResolvedValue('result');
      router.register('test', handler);

      await router.handle({
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
      });

      expect(handler).toHaveBeenCalledWith(undefined);
    });
  });

  describe('handleBatch', () => {
    it('should handle batch of requests', async () => {
      const router = new JsonRpcRouter();
      router.register('add', async (params: { a: number; b: number }) => params.a + params.b);
      router.register('multiply', async (params: { a: number; b: number }) => params.a * params.b);

      const responses = await router.handleBatch([
        { jsonrpc: '2.0', id: '1', method: 'add', params: { a: 1, b: 2 } },
        { jsonrpc: '2.0', id: '2', method: 'multiply', params: { a: 3, b: 4 } },
      ]);

      expect(responses).toHaveLength(2);
      expect(responses[0]?.result).toBe(3);
      expect(responses[1]?.result).toBe(12);
    });

    it('should return empty array for empty batch', async () => {
      const router = new JsonRpcRouter();

      const responses = await router.handleBatch([]);

      expect(responses).toEqual([]);
    });

    it('should process requests in parallel', async () => {
      const router = new JsonRpcRouter();
      const order: number[] = [];

      router.register('slow', async () => {
        await new Promise(r => setTimeout(r, 50));
        order.push(1);
        return 'slow';
      });

      router.register('fast', async () => {
        order.push(2);
        return 'fast';
      });

      await router.handleBatch([
        { jsonrpc: '2.0', id: '1', method: 'slow' },
        { jsonrpc: '2.0', id: '2', method: 'fast' },
      ]);

      // Fast should complete before slow due to parallel execution
      expect(order[0]).toBe(2);
      expect(order[1]).toBe(1);
    });
  });
});
