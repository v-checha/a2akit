import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import { createA2ARouter, createA2AMiddleware, a2aErrorHandler } from './middleware.js';
import { A2AAgent, Skill, Streaming, TextPart } from '@a2akit/core';

// Test agent
@A2AAgent({
  name: 'Test Express Agent',
  description: 'Test agent for Express',
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

describe('createA2ARouter', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/a2a', createA2ARouter(TestAgent));
  });

  describe('GET /.well-known/agent.json', () => {
    it('should return agent card', async () => {
      const res = await request(app)
        .get('/a2a/.well-known/agent.json')
        .expect(200);

      expect(res.body.name).toBe('Test Express Agent');
      expect(res.body.description).toBe('Test agent for Express');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.skills).toHaveLength(3);
    });

    it('should include correct URL', async () => {
      const res = await request(app)
        .get('/a2a/.well-known/agent.json')
        .expect(200);

      expect(res.body.url).toMatch(/^http:\/\/127\.0\.0\.1/);
    });

    it('should include capabilities', async () => {
      const res = await request(app)
        .get('/a2a/.well-known/agent.json')
        .expect(200);

      expect(res.body.capabilities).toBeDefined();
      expect(res.body.capabilities.streaming).toBe(true);
    });
  });

  describe('POST / (JSON-RPC)', () => {
    it('should handle tasks/send', async () => {
      const res = await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-1',
            message: { role: 'user', parts: [{ type: 'text', text: 'World' }] },
            metadata: { skillId: 'greet' },
          },
        })
        .expect(200);

      expect(res.body.jsonrpc).toBe('2.0');
      expect(res.body.id).toBe('1');
      expect(res.body.result.status.state).toBe('completed');
    });

    it('should handle tasks/get', async () => {
      // Create task first
      await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-get-test',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
            metadata: { skillId: 'greet' },
          },
        });

      const res = await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '2',
          method: 'tasks/get',
          params: { id: 'task-get-test' },
        })
        .expect(200);

      expect(res.body.result.id).toBe('task-get-test');
      expect(res.body.result.status.state).toBe('completed');
    });

    it('should handle tasks/cancel', async () => {
      // Create task first (don't complete it)
      await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-cancel-test',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
            metadata: { skillId: 'greet' },
          },
        });

      // For cancel to work, we need a task in submitted/working state
      // Since our task completes immediately, let's test the error case
      const res = await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '2',
          method: 'tasks/cancel',
          params: { id: 'task-cancel-test' },
        })
        .expect(200);

      // Task already completed, so cancel will fail
      expect(res.body.error).toBeDefined();
    });

    it('should return error for invalid JSON-RPC request', async () => {
      const res = await request(app)
        .post('/a2a')
        .send({ invalid: 'request' })
        .expect(200);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(-32600);
      expect(res.body.error.message).toBe('Invalid JSON-RPC request');
    });

    it('should return error for missing jsonrpc version', async () => {
      const res = await request(app)
        .post('/a2a')
        .send({
          id: '1',
          method: 'tasks/send',
        })
        .expect(200);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(-32600);
    });

    it('should return error for unknown method', async () => {
      const res = await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'unknown/method',
        })
        .expect(200);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(-32601);
    });

    it('should return error for missing skillId', async () => {
      const res = await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-1',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          },
        })
        .expect(200);

      expect(res.body.error).toBeDefined();
    });

    it('should handle skill error', async () => {
      const res = await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'task-error',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
            metadata: { skillId: 'error' },
          },
        })
        .expect(200);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('Test error');
    });
  });

  describe('POST / (Streaming)', () => {
    it('should handle tasks/sendSubscribe with SSE', async () => {
      const res = await request(app)
        .post('/a2a')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/sendSubscribe',
          params: {
            id: 'task-stream',
            message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
            metadata: { skillId: 'stream' },
          },
        })
        .buffer(true)
        .parse((res, callback) => {
          let data = '';
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.body).toContain('event: message');
      expect(res.body).toContain('"state":"working"');
      expect(res.body).toContain('"state":"completed"');
    });
  });
});

describe('createA2AMiddleware', () => {
  it('should be an alias for createA2ARouter', () => {
    expect(createA2AMiddleware).toBe(createA2ARouter);
  });
});

describe('a2aErrorHandler', () => {
  it('should return JSON-RPC error response', () => {
    const mockReq = {} as Request;
    const mockRes = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    a2aErrorHandler(new Error('Test error'), mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Test error',
      },
    });

    consoleSpy.mockRestore();
  });

  it('should call next if headers already sent', () => {
    const mockReq = {} as Request;
    const mockRes = {
      headersSent: true,
    } as Response;
    const mockNext = vi.fn() as NextFunction;
    const error = new Error('Test error');

    a2aErrorHandler(error, mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should use default message when error has no message', () => {
    const mockReq = {} as Request;
    const mockRes = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error();
    error.message = '';
    a2aErrorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Internal Server Error',
        }),
      })
    );

    consoleSpy.mockRestore();
  });
});

describe('basePath option', () => {
  it('should use basePath in agent card URL', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1', createA2ARouter(TestAgent, { basePath: '/api/v1' }));

    const res = await request(app)
      .get('/api/v1/.well-known/agent.json')
      .expect(200);

    expect(res.body.url).toContain('/api/v1');
  });
});
