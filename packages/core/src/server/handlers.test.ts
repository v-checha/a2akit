import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSendHandler,
  createGetHandler,
  createCancelHandler,
  createHandlers,
  type SendParams,
  type GetParams,
  type CancelParams,
} from './handlers.js';
import { TaskManager } from '../task/manager.js';
import { SkillInvoker } from './invoker.js';
import { A2AAgent } from '../decorators/agent.js';
import { Skill, Streaming } from '../decorators/skill.js';
import { TextPart } from '../decorators/params.js';
import { InvalidParamsError, TaskNotFoundError } from '../errors/index.js';

// Test agent class
@A2AAgent({ name: 'Test Agent', description: 'Test', version: '1.0.0' })
class TestAgent {
  @Skill({ id: 'greet', name: 'Greet', description: 'Greet' })
  greet(@TextPart() name: string): string {
    return `Hello, ${name}!`;
  }

  @Skill({ id: 'error', name: 'Error', description: 'Error' })
  error(): string {
    throw new Error('Intentional error');
  }

  @Skill({ id: 'stream', name: 'Stream', description: 'Stream' })
  @Streaming()
  async *stream(@TextPart() input: string): AsyncGenerator<string> {
    yield `Part 1: ${input}`;
    yield 'Part 2';
  }
}

describe('createSendHandler', () => {
  let taskManager: TaskManager;
  let invoker: SkillInvoker;
  let handler: (params: SendParams) => Promise<unknown>;

  beforeEach(() => {
    taskManager = new TaskManager();
    invoker = new SkillInvoker(new TestAgent(), TestAgent);
    handler = createSendHandler(taskManager, invoker);
  });

  it('should execute skill and return completed task', async () => {
    const result = await handler({
      id: 'task-1',
      message: { role: 'user', parts: [{ type: 'text', text: 'World' }] },
      metadata: { skillId: 'greet' },
    });

    expect(result).toMatchObject({
      id: 'task-1',
      status: { state: 'completed' },
    });
    expect(result.status.message?.parts[0]).toMatchObject({
      type: 'text',
      text: 'Hello, World!',
    });
  });

  it('should throw InvalidParamsError when id is missing', async () => {
    await expect(
      handler({
        id: '',
        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
        metadata: { skillId: 'greet' },
      })
    ).rejects.toThrow(InvalidParamsError);
  });

  it('should throw InvalidParamsError when message is missing', async () => {
    await expect(
      handler({
        id: 'task-1',
        message: undefined as any,
        metadata: { skillId: 'greet' },
      })
    ).rejects.toThrow(InvalidParamsError);
  });

  it('should throw InvalidParamsError when skillId is missing', async () => {
    await expect(
      handler({
        id: 'task-1',
        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
        metadata: {},
      })
    ).rejects.toThrow(InvalidParamsError);
    await expect(
      handler({
        id: 'task-1',
        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
      })
    ).rejects.toThrow(InvalidParamsError);
  });

  it('should throw InvalidParamsError for unknown skill', async () => {
    await expect(
      handler({
        id: 'task-1',
        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
        metadata: { skillId: 'unknown' },
      })
    ).rejects.toThrow(InvalidParamsError);
  });

  it('should store message in task history', async () => {
    await handler({
      id: 'task-1',
      message: { role: 'user', parts: [{ type: 'text', text: 'World' }] },
      metadata: { skillId: 'greet' },
    });

    const task = taskManager.get('task-1');
    expect(task?.history).toHaveLength(2); // User message + agent response
    expect(task?.history?.[0]?.role).toBe('user');
    expect(task?.history?.[1]?.role).toBe('agent');
  });

  it('should reuse existing task', async () => {
    taskManager.create({ id: 'task-1', contextId: 'ctx-1' });

    const result = await handler({
      id: 'task-1',
      message: { role: 'user', parts: [{ type: 'text', text: 'World' }] },
      metadata: { skillId: 'greet' },
    });

    expect(result.contextId).toBe('ctx-1');
  });

  it('should set task to failed on error', async () => {
    await expect(
      handler({
        id: 'task-1',
        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
        metadata: { skillId: 'error' },
      })
    ).rejects.toThrow('Intentional error');

    const task = taskManager.get('task-1');
    expect(task?.status.state).toBe('failed');
  });

  it('should handle streaming skill in non-streaming context', async () => {
    const result = await handler({
      id: 'task-1',
      message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      metadata: { skillId: 'stream' },
    });

    expect(result.status.state).toBe('completed');
    // Streaming result should be collected
    expect(result.status.message?.parts[0]).toMatchObject({
      type: 'text',
      text: 'Part 1: HelloPart 2',
    });
  });

  it('should create task with metadata', async () => {
    await handler({
      id: 'task-1',
      message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
      metadata: { skillId: 'greet', custom: 'value' },
    });

    const task = taskManager.get('task-1');
    expect(task?.metadata).toMatchObject({ skillId: 'greet', custom: 'value' });
  });

  it('should create task with contextId', async () => {
    await handler({
      id: 'task-1',
      contextId: 'ctx-1',
      message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
      metadata: { skillId: 'greet' },
    });

    const task = taskManager.get('task-1');
    expect(task?.contextId).toBe('ctx-1');
  });
});

describe('createGetHandler', () => {
  let taskManager: TaskManager;
  let handler: (params: GetParams) => Promise<unknown>;

  beforeEach(() => {
    taskManager = new TaskManager();
    handler = createGetHandler(taskManager);
  });

  it('should return task by ID', async () => {
    taskManager.create({ id: 'task-1' });

    const result = await handler({ id: 'task-1' });

    expect(result).toMatchObject({ id: 'task-1' });
  });

  it('should throw InvalidParamsError when id is missing', async () => {
    await expect(handler({ id: '' })).rejects.toThrow(InvalidParamsError);
  });

  it('should throw TaskNotFoundError for non-existent task', async () => {
    await expect(handler({ id: 'non-existent' })).rejects.toThrow(TaskNotFoundError);
  });

  it('should limit history when historyLength provided', async () => {
    taskManager.create({ id: 'task-1' });
    taskManager.appendHistory('task-1', { role: 'user', parts: [{ type: 'text', text: '1' }] });
    taskManager.appendHistory('task-1', { role: 'agent', parts: [{ type: 'text', text: '2' }] });
    taskManager.appendHistory('task-1', { role: 'user', parts: [{ type: 'text', text: '3' }] });

    const result = await handler({ id: 'task-1', historyLength: 2 });

    expect(result.history).toHaveLength(2);
    expect(result.history?.[0]?.parts[0]).toMatchObject({ text: '2' });
    expect(result.history?.[1]?.parts[0]).toMatchObject({ text: '3' });
  });

  it('should return full history when historyLength not provided', async () => {
    taskManager.create({ id: 'task-1' });
    taskManager.appendHistory('task-1', { role: 'user', parts: [{ type: 'text', text: '1' }] });
    taskManager.appendHistory('task-1', { role: 'agent', parts: [{ type: 'text', text: '2' }] });

    const result = await handler({ id: 'task-1' });

    expect(result.history).toHaveLength(2);
  });
});

describe('createCancelHandler', () => {
  let taskManager: TaskManager;
  let handler: (params: CancelParams) => Promise<unknown>;

  beforeEach(() => {
    taskManager = new TaskManager();
    handler = createCancelHandler(taskManager);
  });

  it('should cancel task', async () => {
    taskManager.create({ id: 'task-1' });

    const result = await handler({ id: 'task-1' });

    expect(result).toMatchObject({
      id: 'task-1',
      status: { state: 'canceled' },
    });
  });

  it('should throw InvalidParamsError when id is missing', async () => {
    await expect(handler({ id: '' })).rejects.toThrow(InvalidParamsError);
  });

  it('should throw TaskNotFoundError for non-existent task', async () => {
    await expect(handler({ id: 'non-existent' })).rejects.toThrow(TaskNotFoundError);
  });
});

describe('createHandlers', () => {
  it('should create all standard handlers', () => {
    const taskManager = new TaskManager();
    const invoker = new SkillInvoker(new TestAgent(), TestAgent);

    const handlers = createHandlers({ taskManager, invoker });

    expect(handlers['tasks/send']).toBeDefined();
    expect(handlers['tasks/get']).toBeDefined();
    expect(handlers['tasks/cancel']).toBeDefined();
    expect(typeof handlers['tasks/send']).toBe('function');
    expect(typeof handlers['tasks/get']).toBe('function');
    expect(typeof handlers['tasks/cancel']).toBe('function');
  });
});
