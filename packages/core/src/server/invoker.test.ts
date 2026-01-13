import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { SkillInvoker } from './invoker.js';
import { A2AAgent } from '../decorators/agent.js';
import { Skill, Streaming } from '../decorators/skill.js';
import { TextPart, FilePart, DataPart, Message, TaskContext, Parts } from '../decorators/params.js';
import { SkillNotFoundError } from '../errors/index.js';
import type { Message as MessageType, Task } from '../types/protocol.js';

describe('SkillInvoker', () => {
  describe('hasSkill', () => {
    it('should return true for existing skill', () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @Skill({ id: 'greet', name: 'Greet', description: 'Greet' })
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
        @Skill({ id: 'greet', name: 'Greet', description: 'Greeting skill' })
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
        @Skill({ id: 'stream', name: 'Stream', description: 'Stream' })
        @Streaming()
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
        @Skill({ id: 'normal', name: 'Normal', description: 'Normal' })
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
        @Skill({ id: 'greet', name: 'Greet', description: 'Greet' })
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
        @Skill({ id: 'echo', name: 'Echo', description: 'Echo' })
        echo(@TextPart() text: string): string {
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
        @Skill({ id: 'process', name: 'Process', description: 'Process' })
        process(@FilePart() file: { name?: string }): string {
          return `File: ${file?.name ?? 'unknown'}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: MessageType = {
        role: 'user',
        parts: [{ type: 'file', file: { name: 'test.txt', uri: 'https://example.com' } }],
      };

      const result = await invoker.invoke('process', msg, task);

      expect(result).toBe('File: test.txt');
    });

    it('should extract data parameter', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @Skill({ id: 'data', name: 'Data', description: 'Data' })
        processData(@DataPart() data: { value: number }): string {
          return `Value: ${data?.value}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: MessageType = {
        role: 'user',
        parts: [{ type: 'data', data: { value: 42 } }],
      };

      const result = await invoker.invoke('data', msg, task);

      expect(result).toBe('Value: 42');
    });

    it('should extract message parameter', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @Skill({ id: 'msg', name: 'Msg', description: 'Msg' })
        processMsg(@Message() msg: MessageType): string {
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
        @Skill({ id: 'task', name: 'Task', description: 'Task' })
        processTask(@TaskContext() task: Task): string {
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
        @Skill({ id: 'parts', name: 'Parts', description: 'Parts' })
        processParts(@Parts() allParts: unknown[]): string {
          return `Parts: ${allParts.length}`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: MessageType = {
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
        @Skill({ id: 'multi', name: 'Multi', description: 'Multi' })
        multi(
          @TextPart() text: string,
          @TaskContext() task: Task,
          @Message() msg: MessageType
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
        @Skill({ id: 'indexed', name: 'Indexed', description: 'Indexed' })
        indexed(@TextPart(1) text: string): string {
          return text;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: MessageType = {
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
        @Skill({ id: 'default', name: 'Default', description: 'Default' })
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
        @Skill({ id: 'notext', name: 'NoText', description: 'NoText' })
        notext(@TextPart() text: string): string {
          return `Text: "${text}"`;
        }
      }

      const agent = new TestAgent();
      const invoker = new SkillInvoker(agent, TestAgent);
      const task = createTask();
      const msg: MessageType = {
        role: 'user',
        parts: [{ type: 'data', data: {} }],
      };

      const result = await invoker.invoke('notext', msg, task);

      expect(result).toBe('Text: ""');
    });

    it('should return undefined for missing file part', async () => {
      @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
      class TestAgent {
        @Skill({ id: 'nofile', name: 'NoFile', description: 'NoFile' })
        nofile(@FilePart() file: unknown): string {
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
        @Skill({ id: 'broken', name: 'Broken', description: 'Broken' })
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

function createMessage(text: string): MessageType {
  return {
    role: 'user',
    parts: [{ type: 'text', text }],
  };
}
