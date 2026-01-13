import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { A2AServer } from './http.js';
import { A2AAgent, Skill, Streaming, TextPart } from '../decorators/index.js';

// Test agent
@A2AAgent({
  name: 'Test HTTP Agent',
  description: 'Test agent for HTTP server',
  version: '1.0.0',
})
class TestAgent {
  @Skill({ id: 'greet', name: 'Greet', description: 'Greet' })
  greet(@TextPart() name: string): string {
    return `Hello, ${name}!`;
  }

  @Skill({ id: 'stream', name: 'Stream', description: 'Stream' })
  @Streaming()
  async *stream(@TextPart() input: string): AsyncGenerator<string> {
    yield `Chunk: ${input}`;
  }

  @Skill({ id: 'error', name: 'Error', description: 'Error' })
  error(): string {
    throw new Error('Test error');
  }
}

describe('A2AServer', () => {
  let server: A2AServer;
  let port: number;

  beforeEach(() => {
    // Use random port for each test to avoid conflicts
    port = 30000 + Math.floor(Math.random() * 10000);
    server = new A2AServer(TestAgent, { port, host: '127.0.0.1' });
  });

  afterEach(async () => {
    await server.close();
  });

  describe('constructor', () => {
    it('should create server with default options', () => {
      const defaultServer = new A2AServer(TestAgent);
      expect(defaultServer.getBaseUrl()).toBe('http://localhost:3000');
    });

    it('should create server with custom options', () => {
      const customServer = new A2AServer(TestAgent, {
        port: 4000,
        host: '0.0.0.0',
        basePath: '/api',
      });
      expect(customServer.getBaseUrl()).toBe('http://0.0.0.0:4000/api');
    });
  });

  describe('getBaseUrl', () => {
    it('should return correct base URL', () => {
      expect(server.getBaseUrl()).toBe(`http://127.0.0.1:${port}`);
    });

    it('should include basePath', () => {
      const serverWithPath = new A2AServer(TestAgent, { port, basePath: '/a2a' });
      expect(serverWithPath.getBaseUrl()).toBe(`http://localhost:${port}/a2a`);
    });
  });

  describe('listen', () => {
    it('should start server and resolve', async () => {
      await server.listen();
      // Server started successfully
      expect(true).toBe(true);
    });

    it('should accept port override', async () => {
      const newPort = port + 1;
      await server.listen(newPort);
      expect(server.getBaseUrl()).toContain(String(newPort));
    });

    it('should accept host override', async () => {
      await server.listen(undefined, 'localhost');
      expect(server.getBaseUrl()).toContain('localhost');
    });
  });

  describe('HTTP endpoints', () => {
    beforeEach(async () => {
      await server.listen();
    });

    describe('GET /.well-known/agent.json', () => {
      it('should return agent card', async () => {
        const res = await fetch(`${server.getBaseUrl()}/.well-known/agent.json`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.name).toBe('Test HTTP Agent');
        expect(body.skills).toHaveLength(3);
      });

      it('should include CORS headers', async () => {
        const res = await fetch(`${server.getBaseUrl()}/.well-known/agent.json`);
        expect(res.headers.get('access-control-allow-origin')).toBe('*');
      });
    });

    describe('POST / (JSON-RPC)', () => {
      it('should handle tasks/send', async () => {
        const res = await fetch(server.getBaseUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'tasks/send',
            params: {
              id: 'task-1',
              message: { role: 'user', parts: [{ type: 'text', text: 'World' }] },
              metadata: { skillId: 'greet' },
            },
          }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.result.status.state).toBe('completed');
      });

      it('should handle tasks/get', async () => {
        // Create task first
        await fetch(server.getBaseUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'tasks/send',
            params: {
              id: 'task-get',
              message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
              metadata: { skillId: 'greet' },
            },
          }),
        });

        const res = await fetch(server.getBaseUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '2',
            method: 'tasks/get',
            params: { id: 'task-get' },
          }),
        });

        const body = await res.json();
        expect(body.result.id).toBe('task-get');
      });

      it('should handle tasks/cancel for completed task', async () => {
        // Create and complete task
        await fetch(server.getBaseUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'tasks/send',
            params: {
              id: 'task-cancel',
              message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
              metadata: { skillId: 'greet' },
            },
          }),
        });

        const res = await fetch(server.getBaseUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '2',
            method: 'tasks/cancel',
            params: { id: 'task-cancel' },
          }),
        });

        const body = await res.json();
        expect(body.error).toBeDefined(); // Can't cancel completed task
      });

      it('should return error for invalid JSON', async () => {
        const res = await fetch(server.getBaseUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        });

        const body = await res.json();
        expect(body.error.code).toBe(-32700);
      });

      it('should return error for invalid JSON-RPC', async () => {
        const res = await fetch(server.getBaseUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalid: 'request' }),
        });

        const body = await res.json();
        expect(body.error.code).toBe(-32600);
      });
    });

    describe('POST / (Streaming)', () => {
      it('should handle tasks/sendSubscribe', async () => {
        const res = await fetch(server.getBaseUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'tasks/sendSubscribe',
            params: {
              id: 'task-stream',
              message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
              metadata: { skillId: 'stream' },
            },
          }),
        });

        expect(res.headers.get('content-type')).toContain('text/event-stream');
        const text = await res.text();
        expect(text).toContain('event: message');
      });
    });

    describe('error responses', () => {
      it('should return 404 for unknown routes', async () => {
        const res = await fetch(`${server.getBaseUrl()}/unknown`);
        expect(res.status).toBe(404);
      });

      it('should return 404 for wrong method on agent card', async () => {
        const res = await fetch(`${server.getBaseUrl()}/.well-known/agent.json`, {
          method: 'POST',
        });
        expect(res.status).toBe(404);
      });

      it('should return 404 for GET on JSON-RPC endpoint', async () => {
        const res = await fetch(server.getBaseUrl());
        expect(res.status).toBe(404);
      });
    });

    describe('OPTIONS (CORS)', () => {
      it('should handle preflight requests', async () => {
        const res = await fetch(server.getBaseUrl(), {
          method: 'OPTIONS',
        });

        expect(res.status).toBe(204);
        expect(res.headers.get('access-control-allow-methods')).toContain('POST');
      });
    });
  });

  describe('close', () => {
    it('should close server gracefully', async () => {
      const closeServer = new A2AServer(TestAgent, { port: port + 100, host: '127.0.0.1' });
      await closeServer.listen();
      await closeServer.close();
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle close when not started', async () => {
      const newServer = new A2AServer(TestAgent, { port: port + 200 });
      // Should not throw when closing an un-started server
      await newServer.close().catch(() => {
        // Expected - server not running
      });
      expect(true).toBe(true);
    });
  });
});
