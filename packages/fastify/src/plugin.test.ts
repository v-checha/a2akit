import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { createA2APlugin } from './plugin.js';
import { A2AAgent, Skill, Streaming, TextPart } from '@a2akit/core';

// Test agent
@A2AAgent({
  name: 'Test Fastify Agent',
  description: 'Test agent for Fastify',
  version: '1.0.0',
})
class TestAgent {
  @Skill({ id: 'greet', name: 'Greet', description: 'Greet the user' })
  greet(@TextPart() name: string): string {
    return `Hello, ${name}!`;
  }

  @Skill({ id: 'error', name: 'Error', description: 'Throw an error' })
  error(): string {
    throw new Error('Test error');
  }

  @Skill({ id: 'stream', name: 'Stream', description: 'Stream response' })
  @Streaming()
  async *stream(@TextPart() input: string): AsyncGenerator<string> {
    yield `Chunk 1: ${input}`;
    yield 'Chunk 2';
  }
}

describe('createA2APlugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(createA2APlugin(TestAgent), { prefix: '/a2a' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /.well-known/agent.json', () => {
    it('should return agent card', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/a2a/.well-known/agent.json',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe('Test Fastify Agent');
      expect(body.description).toBe('Test agent for Fastify');
      expect(body.version).toBe('1.0.0');
      expect(body.skills).toHaveLength(3);
    });

    it('should include capabilities', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/a2a/.well-known/agent.json',
      });

      const body = JSON.parse(res.body);
      expect(body.capabilities).toBeDefined();
      expect(body.capabilities.streaming).toBe(true);
    });
  });

  describe('POST / (JSON-RPC)', () => {
    it('should handle tasks/send', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-1',
            message: { role: 'user', parts: [{ type: 'text', text: 'World' }] },
            metadata: { skillId: 'greet' },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe('1');
      expect(body.result.status.state).toBe('completed');
    });

    it('should handle tasks/get', async () => {
      // Create task first
      await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-get-test',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
            metadata: { skillId: 'greet' },
          },
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '2',
          method: 'tasks/get',
          params: { id: 'task-get-test' },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.result.id).toBe('task-get-test');
      expect(body.result.status.state).toBe('completed');
    });

    it('should handle tasks/cancel error for completed task', async () => {
      // Create and complete task first
      await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-cancel-test',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
            metadata: { skillId: 'greet' },
          },
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '2',
          method: 'tasks/cancel',
          params: { id: 'task-cancel-test' },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
    });

    it('should return error for invalid JSON-RPC request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: { invalid: 'request' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32600);
      expect(body.error.message).toBe('Invalid JSON-RPC request');
    });

    it('should return error for missing jsonrpc version', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          id: '1',
          method: 'tasks/send',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32600);
    });

    it('should return error for unknown method', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '1',
          method: 'unknown/method',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32601);
    });

    it('should return error for missing skillId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-1',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
    });

    it('should handle skill error', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-error',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
            metadata: { skillId: 'error' },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).toContain('Test error');
    });
  });

  describe('POST / (Streaming)', () => {
    it('should handle tasks/sendSubscribe with SSE', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/a2a',
        payload: {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/sendSubscribe',
          params: {
            id: 'task-stream',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
            metadata: { skillId: 'stream' },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.body).toContain('event: message');
      expect(res.body).toContain('"state":"working"');
      expect(res.body).toContain('"state":"completed"');
    });
  });
});

describe('plugin without prefix', () => {
  it('should work without prefix option', async () => {
    const app = Fastify();
    await app.register(createA2APlugin(TestAgent));

    const res = await app.inject({
      method: 'GET',
      url: '/.well-known/agent.json',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe('Test Fastify Agent');

    await app.close();
  });
});
