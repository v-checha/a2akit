import { describe, it, expect } from 'vitest';
import {
  isTextPart,
  isFilePart,
  isDataPart,
  isTerminalState,
  type Part,
  type TaskState,
} from './protocol.js';

describe('Type guards', () => {
  describe('isTextPart', () => {
    it('should return true for TextPart', () => {
      const part: Part = { type: 'text', text: 'Hello' };
      expect(isTextPart(part)).toBe(true);
    });

    it('should return false for FilePart', () => {
      const part: Part = { type: 'file', file: { uri: 'https://example.com/file' } };
      expect(isTextPart(part)).toBe(false);
    });

    it('should return false for DataPart', () => {
      const part: Part = { type: 'data', data: { key: 'value' } };
      expect(isTextPart(part)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const part: Part = { type: 'text', text: 'Hello', metadata: { key: 'value' } };
      if (isTextPart(part)) {
        // TypeScript should allow accessing text property
        expect(part.text).toBe('Hello');
        expect(part.metadata).toEqual({ key: 'value' });
      }
    });
  });

  describe('isFilePart', () => {
    it('should return true for FilePart', () => {
      const part: Part = { type: 'file', file: { uri: 'https://example.com/file' } };
      expect(isFilePart(part)).toBe(true);
    });

    it('should return false for TextPart', () => {
      const part: Part = { type: 'text', text: 'Hello' };
      expect(isFilePart(part)).toBe(false);
    });

    it('should return false for DataPart', () => {
      const part: Part = { type: 'data', data: [] };
      expect(isFilePart(part)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const part: Part = {
        type: 'file',
        file: { name: 'test.txt', mimeType: 'text/plain', bytes: 'SGVsbG8=' },
      };
      if (isFilePart(part)) {
        expect(part.file.name).toBe('test.txt');
        expect(part.file.mimeType).toBe('text/plain');
        expect(part.file.bytes).toBe('SGVsbG8=');
      }
    });
  });

  describe('isDataPart', () => {
    it('should return true for DataPart with object', () => {
      const part: Part = { type: 'data', data: { key: 'value' } };
      expect(isDataPart(part)).toBe(true);
    });

    it('should return true for DataPart with array', () => {
      const part: Part = { type: 'data', data: [1, 2, 3] };
      expect(isDataPart(part)).toBe(true);
    });

    it('should return false for TextPart', () => {
      const part: Part = { type: 'text', text: 'Hello' };
      expect(isDataPart(part)).toBe(false);
    });

    it('should return false for FilePart', () => {
      const part: Part = { type: 'file', file: { uri: 'https://example.com' } };
      expect(isDataPart(part)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const part: Part = { type: 'data', data: { nested: { deep: true } } };
      if (isDataPart(part)) {
        expect(part.data).toEqual({ nested: { deep: true } });
      }
    });
  });
});

describe('isTerminalState', () => {
  it('should return true for completed state', () => {
    expect(isTerminalState('completed')).toBe(true);
  });

  it('should return true for canceled state', () => {
    expect(isTerminalState('canceled')).toBe(true);
  });

  it('should return true for failed state', () => {
    expect(isTerminalState('failed')).toBe(true);
  });

  it('should return false for submitted state', () => {
    expect(isTerminalState('submitted')).toBe(false);
  });

  it('should return false for working state', () => {
    expect(isTerminalState('working')).toBe(false);
  });

  it('should return false for input-required state', () => {
    expect(isTerminalState('input-required')).toBe(false);
  });

  it('should return false for unknown state', () => {
    expect(isTerminalState('unknown')).toBe(false);
  });

  it('should handle all TaskState values', () => {
    const terminalStates: TaskState[] = ['completed', 'canceled', 'failed'];
    const nonTerminalStates: TaskState[] = ['submitted', 'working', 'input-required', 'unknown'];

    for (const state of terminalStates) {
      expect(isTerminalState(state)).toBe(true);
    }

    for (const state of nonTerminalStates) {
      expect(isTerminalState(state)).toBe(false);
    }
  });
});
