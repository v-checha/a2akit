import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { TextPart, FilePart, DataPart, Message, TaskContext, Parts } from './params.js';
import { PARAM_METADATA, type ParamMetadata } from './metadata.js';

describe('Parameter decorators', () => {
  describe('@TextPart', () => {
    it('should register text parameter metadata', () => {
      class TestAgent {
        testMethod(@TextPart() _text: string): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params).toHaveLength(1);
      expect(params[0]?.type).toBe('text');
      expect(params[0]?.index).toBe(0);
      expect(params[0]?.partIndex).toBeUndefined();
    });

    it('should support partIndex', () => {
      class TestAgent {
        testMethod(@TextPart(2) _text: string): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params[0]?.partIndex).toBe(2);
    });
  });

  describe('@FilePart', () => {
    it('should register file parameter metadata', () => {
      class TestAgent {
        testMethod(@FilePart() _file: unknown): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params).toHaveLength(1);
      expect(params[0]?.type).toBe('file');
      expect(params[0]?.index).toBe(0);
    });

    it('should support partIndex', () => {
      class TestAgent {
        testMethod(@FilePart(1) _file: unknown): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params[0]?.partIndex).toBe(1);
    });
  });

  describe('@DataPart', () => {
    it('should register data parameter metadata', () => {
      class TestAgent {
        testMethod(@DataPart() _data: unknown): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params).toHaveLength(1);
      expect(params[0]?.type).toBe('data');
      expect(params[0]?.index).toBe(0);
    });

    it('should support partIndex', () => {
      class TestAgent {
        testMethod(@DataPart(0) _data: unknown): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params[0]?.partIndex).toBe(0);
    });
  });

  describe('@Message', () => {
    it('should register message parameter metadata', () => {
      class TestAgent {
        testMethod(@Message() _msg: unknown): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params).toHaveLength(1);
      expect(params[0]?.type).toBe('message');
      expect(params[0]?.index).toBe(0);
    });
  });

  describe('@TaskContext', () => {
    it('should register task parameter metadata', () => {
      class TestAgent {
        testMethod(@TaskContext() _task: unknown): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params).toHaveLength(1);
      expect(params[0]?.type).toBe('task');
      expect(params[0]?.index).toBe(0);
    });
  });

  describe('@Parts', () => {
    it('should register parts parameter metadata', () => {
      class TestAgent {
        testMethod(@Parts() _allParts: unknown[]): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params).toHaveLength(1);
      expect(params[0]?.type).toBe('parts');
      expect(params[0]?.index).toBe(0);
    });
  });

  describe('Multiple parameters', () => {
    it('should register multiple parameters', () => {
      class TestAgent {
        testMethod(
          @TextPart() _text: string,
          @TaskContext() _task: unknown,
          @Message() _msg: unknown
        ): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params).toHaveLength(3);

      const textParam = params.find(p => p.type === 'text');
      const taskParam = params.find(p => p.type === 'task');
      const msgParam = params.find(p => p.type === 'message');

      expect(textParam?.index).toBe(0);
      expect(taskParam?.index).toBe(1);
      expect(msgParam?.index).toBe(2);
    });

    it('should handle mixed parameters with part indices', () => {
      class TestAgent {
        testMethod(
          @TextPart(0) _text1: string,
          @TextPart(1) _text2: string,
          @FilePart(0) _file: unknown
        ): void {}
      }

      const instance = new TestAgent();
      const params = Reflect.getMetadata(PARAM_METADATA, instance, 'testMethod') as ParamMetadata[];
      expect(params).toHaveLength(3);

      const sorted = params.sort((a, b) => a.index - b.index);
      expect(sorted[0]?.type).toBe('text');
      expect(sorted[0]?.partIndex).toBe(0);
      expect(sorted[1]?.type).toBe('text');
      expect(sorted[1]?.partIndex).toBe(1);
      expect(sorted[2]?.type).toBe('file');
      expect(sorted[2]?.partIndex).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should throw when used on constructor parameter', () => {
      expect(() => {
        class TestAgent {
          constructor(@TextPart() _text: string) {}
        }
        // Intentionally calling with wrong args to test error - decorator should throw first
        new TestAgent(undefined as unknown as string);
      }).toThrow('Parameter decorators can only be used on method parameters');
    });
  });
});
