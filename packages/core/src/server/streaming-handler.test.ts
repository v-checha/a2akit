import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleStreamingRequest } from './streaming-handler.js';
import { TaskManager } from '../task/manager.js';
import { SkillInvoker } from './invoker.js';
import { SSEWriter } from './sse.js';
import { A2AAgent, Skill, Streaming, TextPart } from '../decorators/index.js';

// Test agent
@A2AAgent({
  name: 'Test Agent',
  description: 'Test',
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
    yield `Chunk 1: ${input}`;
    yield 'Chunk 2';
  }

  @Skill({ id: 'error', name: 'Error', description: 'Error' })
  error(): string {
    throw new Error('Test error');
  }
}

describe('handleStreamingRequest', () => {
  let taskManager: TaskManager;
  let invoker: SkillInvoker;
  let mockResponse: { data: string[]; headers: Record<string, string> };
  let sse: SSEWriter;

  beforeEach(() => {
    taskManager = new TaskManager();
    const agent = new TestAgent();
    invoker = new SkillInvoker(agent, TestAgent);
    mockResponse = { data: [], headers: {} };

    const mockRes = {
      writeHead: vi.fn((_status: number, headers: Record<string, string>) => {
        mockResponse.headers = headers;
      }),
      write: vi.fn((data: string) => {
        mockResponse.data.push(data);
        return true;
      }),
      end: vi.fn(),
      on: vi.fn(),
    };

    sse = new SSEWriter(mockRes as unknown as import('http').ServerResponse);
  });

  describe('parameter validation', () => {
    it('should error on missing id', async () => {
      await handleStreamingRequest(
        { message: { role: 'user', parts: [{ type: 'text', text: 'test' }] } } as any,
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('Missing required parameter: id');
    });

    it('should error on missing message', async () => {
      await handleStreamingRequest(
        { id: 'task-1' } as any,
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('Missing required parameter: message');
    });

    it('should error on missing skillId', async () => {
      await handleStreamingRequest(
        {
          id: 'task-1',
          message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('Missing required metadata.skillId');
    });

    it('should error on unknown skill', async () => {
      await handleStreamingRequest(
        {
          id: 'task-1',
          message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
          metadata: { skillId: 'unknown' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('Unknown skill: unknown');
    });
  });

  describe('non-streaming skill', () => {
    it('should handle non-streaming skill result', async () => {
      await handleStreamingRequest(
        {
          id: 'task-1',
          message: { role: 'user', parts: [{ type: 'text', text: 'World' }] },
          metadata: { skillId: 'greet' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('Hello, World!');
      expect(output).toContain('"state":"completed"');
    });

    it('should create task if not exists', async () => {
      await handleStreamingRequest(
        {
          id: 'task-new',
          message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          metadata: { skillId: 'greet' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const task = taskManager.get('task-new');
      expect(task).toBeDefined();
      expect(task?.status.state).toBe('completed');
    });

    it('should use existing task', async () => {
      taskManager.create({ id: 'task-existing' });

      await handleStreamingRequest(
        {
          id: 'task-existing',
          message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          metadata: { skillId: 'greet' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const task = taskManager.get('task-existing');
      expect(task?.status.state).toBe('completed');
    });
  });

  describe('streaming skill', () => {
    it('should handle streaming skill with multiple chunks', async () => {
      await handleStreamingRequest(
        {
          id: 'task-stream',
          message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          metadata: { skillId: 'stream' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('Chunk 1: Test');
      expect(output).toContain('Chunk 2');
      expect(output).toContain('"state":"completed"');
    });

    it('should mark chunks as append after first', async () => {
      await handleStreamingRequest(
        {
          id: 'task-stream-2',
          message: { role: 'user', parts: [{ type: 'text', text: 'X' }] },
          metadata: { skillId: 'stream' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      // First chunk doesn't have append
      expect(output).toContain('"append":false');
      // Second chunk has append
      expect(output).toContain('"append":true');
    });

    it('should send final chunk marker', async () => {
      await handleStreamingRequest(
        {
          id: 'task-stream-3',
          message: { role: 'user', parts: [{ type: 'text', text: 'Y' }] },
          metadata: { skillId: 'stream' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('"lastChunk":true');
    });
  });

  describe('error handling', () => {
    it('should handle skill errors', async () => {
      await handleStreamingRequest(
        {
          id: 'task-error',
          message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          metadata: { skillId: 'error' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('"state":"failed"');

      const task = taskManager.get('task-error');
      expect(task?.status.state).toBe('failed');
    });

    it('should include error message in status', async () => {
      await handleStreamingRequest(
        {
          id: 'task-error-msg',
          message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          metadata: { skillId: 'error' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const task = taskManager.get('task-error-msg');
      expect(task?.status.message?.parts[0]).toEqual({
        type: 'text',
        text: 'Error: Test error',
      });
    });
  });

  describe('context handling', () => {
    it('should pass contextId to task creation', async () => {
      await handleStreamingRequest(
        {
          id: 'task-ctx',
          contextId: 'ctx-123',
          message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          metadata: { skillId: 'greet' },
        },
        taskManager,
        invoker,
        sse,
        'req-1'
      );

      const task = taskManager.get('task-ctx');
      expect(task?.contextId).toBe('ctx-123');
    });
  });

  describe('request ID handling', () => {
    it('should work without request ID', async () => {
      await handleStreamingRequest(
        {
          id: 'task-no-req',
          message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
          metadata: { skillId: 'greet' },
        },
        taskManager,
        invoker,
        sse
      );

      const output = mockResponse.data.join('');
      expect(output).toContain('"state":"completed"');
    });
  });
});
