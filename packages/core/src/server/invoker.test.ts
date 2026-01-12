import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { SkillInvoker } from './invoker.js';
import { A2AAgent } from '../decorators/agent.js';
import { skill, streaming } from '../decorators/skill.js';
import { textPart, filePart, dataPart, message, taskContext, parts } from '../decorators/params.js';
import { SkillNotFoundError } from '../errors/index.js';
import type { Message, Task } from '../types/protocol.js';

describe('SkillInvoker', () => {
  describe('hasSkill', () => {
    it('should return true for existing skill', () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'greet', name: 'Greet', description: 'Greet' })
        greet(): string {
          return 'Hello';
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);

      expect(invoker.hasSkill('greet')).toBe(true);
    });

    it('should return false for non-existent skill', () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {}

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);

      expect(invoker.hasSkill('unknown')).toBe(false);
    });
  });

  describe('getSkill', () => {
    it('should return skill metadata', () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'greet', name: 'Greet', description: 'Greeting skill' })
        greet(): string {
          return 'Hello';
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const skillMeta = invoker.getSkill('greet');

      expect(skillMeta?.id).toBe('greet');
      expect(skillMeta?.name).toBe('Greet');
      expect(skillMeta?.description).toBe('Greeting skill');
    });

    it('should return undefined for non-existent skill', () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {}

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);

      expect(invoker.getSkill('unknown')).toBeUndefined();
    });
  });

  describe('isStreaming', () => {
    it('should return true for streaming skill', () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'stream', name: 'Stream', description: 'Stream' })
        @streaming()
        *stream(): Generator<string> {
          yield 'chunk';
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);

      expect(invoker.isStreaming('stream')).toBe(true);
    });

    it('should return false for non-streaming skill', () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'normal', name: 'Normal', description: 'Normal' })
        normal(): string {
          return 'result';
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);

      expect(invoker.isStreaming('normal')).toBe(false);
    });

    it('should return false for non-existent skill', () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {}

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);

      expect(invoker.isStreaming('unknown')).toBe(false);
    });
  });

  describe('invoke', () => {
    it('should invoke skill and return result', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'greet', name: 'Greet', description: 'Greet' })
        greet(): string {
          return 'Hello, World!';
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const message = createMessage('');

      const result = await invoker.invoke('greet', message, task);

      expect(result).toBe('Hello, World!');
    });

    it('should throw SkillNotFoundError for unknown skill', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {}

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const message = createMessage('');

      await expect(invoker.invoke('unknown', message, task)).rejects.toThrow(SkillNotFoundError);
    });

    it('should extract text parameter', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'echo', name: 'Echo', description: 'Echo' })
        echo(@textPart() text: string): string {
          return `Echo: ${text}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg = createMessage('Hello');

      const result = await invoker.invoke('echo', msg, task);

      expect(result).toBe('Echo: Hello');
    });

    it('should extract file parameter', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'process', name: 'Process', description: 'Process' })
        process(@filePart() file: { name?: string }): string {
          return `File: ${file?.name ?? 'unknown'}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: Message = {
        role: 'user',
        parts: [{ type: 'file', file: { name: 'test.txt', uri: 'https://example.com' } }],
      };

      const result = await invoker.invoke('process', msg, task);

      expect(result).toBe('File: test.txt');
    });

    it('should extract data parameter', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'data', name: 'Data', description: 'Data' })
        processData(@dataPart() data: { value: number }): string {
          return `Value: ${data?.value}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: Message = {
        role: 'user',
        parts: [{ type: 'data', data: { value: 42 } }],
      };

      const result = await invoker.invoke('data', msg, task);

      expect(result).toBe('Value: 42');
    });

    it('should extract message parameter', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'msg', name: 'Msg', description: 'Msg' })
        processMsg(@message() msg: Message): string {
          return `Role: ${msg.role}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg = createMessage('Hello');

      const result = await invoker.invoke('msg', msg, task);

      expect(result).toBe('Role: user');
    });

    it('should extract task context parameter', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'task', name: 'Task', description: 'Task' })
        processTask(@taskContext() task: Task): string {
          return `Task ID: ${task.id}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask('test-123');
      const msg = createMessage('');

      const result = await invoker.invoke('task', msg, task);

      expect(result).toBe('Task ID: test-123');
    });

    it('should extract parts parameter', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'parts', name: 'Parts', description: 'Parts' })
        processParts(@parts() allParts: unknown[]): string {
          return `Parts: ${allParts.length}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: Message = {
        role: 'user',
        parts: [
          { type: 'text', text: 'Hello' },
          { type: 'data', data: {} },
        ],
      };

      const result = await invoker.invoke('parts', msg, task);

      expect(result).toBe('Parts: 2');
    });

    it('should handle multiple parameters', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'multi', name: 'Multi', description: 'Multi' })
        multi(
          @textPart() text: string,
          @taskContext() task: Task,
          @message() msg: Message
        ): string {
          return `${text}-${task.id}-${msg.role}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask('t1');
      const msg = createMessage('Hello');

      const result = await invoker.invoke('multi', msg, task);

      expect(result).toBe('Hello-t1-user');
    });

    it('should use partIndex for specific part', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'indexed', name: 'Indexed', description: 'Indexed' })
        indexed(@textPart(1) text: string): string {
          return text;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: Message = {
        role: 'user',
        parts: [
          { type: 'text', text: 'First' },
          { type: 'text', text: 'Second' },
        ],
      };

      const result = await invoker.invoke('indexed', msg, task);

      expect(result).toBe('Second');
    });

    it('should default to text when no decorators', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'default', name: 'Default', description: 'Default' })
        default(text: string): string {
          return `Got: ${text}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg = createMessage('Default text');

      const result = await invoker.invoke('default', msg, task);

      expect(result).toBe('Got: Default text');
    });

    it('should return empty string when no text part exists', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'notext', name: 'NoText', description: 'NoText' })
        notext(@textPart() text: string): string {
          return `Text: "${text}"`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: Message = {
        role: 'user',
        parts: [{ type: 'data', data: {} }],
      };

      const result = await invoker.invoke('notext', msg, task);

      expect(result).toBe('Text: ""');
    });

    it('should return undefined for missing file part', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'nofile', name: 'NoFile', description: 'NoFile' })
        nofile(@filePart() file: unknown): string {
          return `File: ${file ?? 'none'}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg = createMessage('No file here');

      const result = await invoker.invoke('nofile', msg, task);

      expect(result).toBe('File: none');
    });

    it('should throw when method not found on instance', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @skill({ id: 'broken', name: 'Broken', description: 'Broken' })
        broken(): string {
          return 'test';
        }
      }

      const agent = new TestAgent();
      // Replace the method with a non-function to simulate broken instance
      Object.defineProperty(agent, 'broken', { value: 'not a function', writable: true });
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg = createMessage('');

      await expect(invoker.invoke('broken', msg, task)).rejects.toThrow(
        'Method "broken" not found on agent instance'
      );
    });
  });
});

// Helper functions
function createTask(id = 'task-1'): Task {
  return {
    id,
    status: { state: 'working', timestamp: new Date().toISOString() },
    history: [],
    artifacts: [],
  };
}

function createMessage(text: string): Message {
  return {
    role: 'user',
    parts: [{ type: 'text', text }],
  };
}
